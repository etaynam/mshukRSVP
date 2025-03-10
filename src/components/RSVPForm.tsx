import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { MapPin, Phone, User, Bus, CheckCircle2, Loader2, Edit, Check, Navigation, AlertCircle, Lock } from 'lucide-react';
import { branches } from '../data/branches';
import { RSVPFormData, Branch, StoredRSVP } from '../types';
import { db, sendOtp, verifyOtp } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, query, where, getDocs, getDoc } from 'firebase/firestore';
import clsx from 'clsx';
import OtpVerificationModal from './OtpVerificationModal';

const STORAGE_KEY = 'purim_party_rsvp';
const SUBMISSION_COOLDOWN = 60 * 1000; // 1 minute cooldown
const WAZE_URL = 'https://waze.com/ul/hsv89xuh1z';

// פונקציית עזר לבדיקת טקסט בעברית בלבד
const isHebrewOnly = (text: string): boolean => {
  // מאפשר אותיות בעברית, רווחים, מקפים וגרשיים (לשמות כמו "יוסף-חיים" או "דה-מרקר")
  const hebrewRegex = /^[\u0590-\u05FF\s'-]+$/;
  return hebrewRegex.test(text);
};

// פונקציית עזר לבדיקת מספר טלפון ישראלי
const isValidIsraeliPhone = (phone: string): boolean => {
  // מנקה את המספר מסימנים מיוחדים
  const cleanedPhone = phone.replace(/[^\d]/g, '');
  
  // בדיקה אם המספר מתחיל ב-05 ומכיל 10 ספרות סה"כ
  // או מתחיל ב-5 (ללא 0) ומכיל 9 ספרות סה"כ
  const isValid = (
    (cleanedPhone.startsWith('05') && cleanedPhone.length === 10) || 
    (cleanedPhone.startsWith('5') && cleanedPhone.length === 9)
  );
  
  return isValid;
};

// פונקציית עזר לניקוי טקסט מהזרקות קוד אפשריות
const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // החלף תווים מיוחדים שיכולים לשמש להזרקת קוד
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;');
};

// Helper function to format branch display info
// המרת פונקציית עזר זו שלא בשימוש
// const formatBranchOption = (branch: Branch) => {
//   const addressInfo = branch.address ? ` - ${branch.address}` : '';
//   return {
//     value: branch.value,
//     label: `${branch.label}${addressInfo}`,
//     city: branch.city
//   };
// };

// Group branches by city and format display
const groupedOptions = branches.reduce((acc: { label: string; options: Branch[] }[], branch) => {
  if (!branch.city) {
    // Branches without city go directly to root level
    acc.push({
      label: branch.label,
      options: [branch]
    });
    return acc;
  }

  const existingGroup = acc.find(group => group.label === branch.city);
  if (existingGroup) {
    existingGroup.options.push(branch);
  } else {
    acc.push({
      label: branch.city,
      options: [branch]
    });
  }
  return acc;
}, []).sort((a, b) => a.label.localeCompare(b.label));

// Helper function to check if a branch is from Beer Sheva
const isBeerShevaBranch = (branchValue: string): boolean => {
  const branch = branches.find(b => b.value === branchValue);
  return branch?.city === "באר שבע";
};

// Helper function to get full branch name with city if available
const getFullBranchName = (branchValue: string): string => {
  const branch = branches.find(b => b.value === branchValue);
  if (!branch) return branchValue;
  
  let display = branch.label;
  if (branch.city) {
    display += ` (${branch.city})`;
  }
  if (branch.address) {
    display += ` - ${branch.address}`;
  }
  return display;
};

interface RSVPFormProps {
  onRsvpChange?: (hasRsvp: boolean) => void;
}

const RSVPForm: React.FC<RSVPFormProps> = ({ onRsvpChange }) => {
  const [formData, setFormData] = useState<RSVPFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    branch: '',
    branchDisplayName: '',
    needsTransportation: false,
  });
  const [showCustomBranch, setShowCustomBranch] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storedRSVP, setStoredRSVP] = useState<StoredRSVP | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingRSVP, setLoadingRSVP] = useState(true);
  const [isBeerSheva, setIsBeerSheva] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [pendingRsvpId, setPendingRsvpId] = useState<string | null>(null);
  const [verifyingPhone, setVerifyingPhone] = useState('');
  const [tempRsvpData, setTempRsvpData] = useState<{id: string, data: RSVPFormData} | null>(null);
  const [verifyingForEdit, setVerifyingForEdit] = useState(false);
  const [isExistingUserFromNewDevice, setIsExistingUserFromNewDevice] = useState(false);

  useEffect(() => {
    // Load stored RSVP data
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as StoredRSVP;
      
      // Check if the RSVP still exists in Firestore
      const checkRSVPExists = async () => {
        setLoadingRSVP(true);
        try {
          const docRef = doc(db, 'rsvps', data.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            // RSVP still exists in Firestore
            setStoredRSVP(data);
            if (isEditing) {
              setFormData(data.data);
            }
            if (onRsvpChange) {
              onRsvpChange(true);
            }
          } else {
            // RSVP was deleted, remove from local storage
            localStorage.removeItem(STORAGE_KEY);
            setStoredRSVP(null);
            setSubmitted(false);
            if (onRsvpChange) {
              onRsvpChange(false);
            }
          }
        } catch (error) {
          console.error("Error checking RSVP existence:", error);
        } finally {
          setLoadingRSVP(false);
        }
      };
      
      checkRSVPExists();
    } else {
      setLoadingRSVP(false);
      if (onRsvpChange) {
        onRsvpChange(false);
      }
    }
  }, [isEditing, onRsvpChange]);

  useEffect(() => {
    // הוספת לוג כשהמודל נפתח או נסגר
    console.log('OTP modal state changed:', otpModalOpen);
  }, [otpModalOpen]);
  
  useEffect(() => {
    // הוספת לוג כשמשתנה דגל עריכה
    console.log('Editing for verification:', verifyingForEdit);
  }, [verifyingForEdit]);

  // Helper to get full name from first and last name
  const getFullName = (first: string, last: string): string => {
    return `${first} ${last}`.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Basic validation
      if (!formData.firstName || !formData.lastName || !formData.phone || !formData.branch) {
        throw new Error('יש למלא את כל השדות');
      }

      // בדיקת שמות בעברית בלבד
      if (!isHebrewOnly(formData.firstName)) {
        throw new Error('שם פרטי חייב להכיל אותיות בעברית בלבד');
      }

      if (!isHebrewOnly(formData.lastName)) {
        throw new Error('שם משפחה חייב להכיל אותיות בעברית בלבד');
      }

      // בדיקת מספר טלפון ישראלי תקין
      if (!isValidIsraeliPhone(formData.phone)) {
        throw new Error('נא להזין מספר טלפון ישראלי תקין (מתחיל ב-05)');
      }
      
      // ודא שהמשתמש בחר סניף אם הוא מעוניין בהסעה
      if (formData.needsTransportation && (!formData.branch || isBeerShevaBranch(formData.branch))) {
        throw new Error('יש לבחור סניף תקין כדי לבקש הסעה');
      }

      // ניקוי הקלט מהזרקות קוד אפשריות לפני שמירה ב-DB
      const sanitizedData = {
        ...formData,
        firstName: sanitizeInput(formData.firstName),
        lastName: sanitizeInput(formData.lastName),
        branchDisplayName: sanitizeInput(formData.branchDisplayName || ''),
        customBranch: sanitizeInput(formData.customBranch || '')
      };

      // Check for existing RSVP with the same phone number
      const rsvpsRef = collection(db, 'rsvps');
      const q = query(rsvpsRef, where('phone', '==', sanitizedData.phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty && !isEditing) {
        // Found existing RSVP with this phone number
        const existingRSVP = {
          id: querySnapshot.docs[0].id,
          data: querySnapshot.docs[0].data() as RSVPFormData
        };
        
        if (existingRSVP.data.phoneVerified) {
          // משתמש מאומת שמנסה להתחבר או לערוך ממכשיר חדש
          // נאחסן את הנתונים הקיימים
          setStoredRSVP(existingRSVP);
          setIsExistingUserFromNewDevice(true);
          
          // נשלח OTP לאימות זהות
          setPendingRsvpId(existingRSVP.id);
          setVerifyingPhone(sanitizedData.phone);
          setOtpModalOpen(true);
          setIsSubmitting(false);
          return;
        } else {
          // אם לא מאומת - פתח מודאל אימות
          setPendingRsvpId(existingRSVP.id);
          setVerifyingPhone(sanitizedData.phone);
          setOtpModalOpen(true);
          setIsSubmitting(false);
          return;
        }
      }

      // Check last submission time
      const lastSubmission = localStorage.getItem('last_submission_time');
      const now = Date.now();
      
      if (lastSubmission && !isEditing) {
        const timeSinceLastSubmission = now - parseInt(lastSubmission);
        if (timeSinceLastSubmission < SUBMISSION_COOLDOWN) {
          throw new Error(`נא להמתין ${Math.ceil((SUBMISSION_COOLDOWN - timeSinceLastSubmission) / 1000)} שניות לפני שליחה חוזרת`);
        }
      }

      const submissionData = {
        ...sanitizedData,
        fullName: getFullName(sanitizedData.firstName, sanitizedData.lastName),
        submittedAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
        phoneVerified: false,
      };

      let rsvpId: string;
      
      if (isEditing && storedRSVP) {
        // Update existing RSVP
        // שמירת מספר הטלפון המקורי, כדי שאי אפשר יהיה לשנות אותו
        const dataToUpdate = {
          ...submissionData,
          phone: storedRSVP.data.phone, // שימור מספר הטלפון המקורי
          phoneVerified: storedRSVP.data.phoneVerified, // שימור סטטוס האימות
          phoneVerifiedAt: storedRSVP.data.phoneVerifiedAt // שימור תאריך האימות
        };
        
        await updateDoc(doc(db, 'rsvps', storedRSVP.id), dataToUpdate);
        rsvpId = storedRSVP.id;
        
        // עדכון נתונים בלוקל סטורג'
        const updatedRSVP = {
          id: rsvpId,
          data: dataToUpdate
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRSVP));
        setStoredRSVP(updatedRSVP);
        setSubmitted(true);
        setIsEditing(false);
        setIsSubmitting(false);
        return;
      } else {
        // Create new RSVP
        const docRef = await addDoc(collection(db, 'rsvps'), submissionData);
        rsvpId = docRef.id;
      }

      // שמור את הנתונים זמנית, אבל אל תעבור למסך האישור עדיין
      const storageData = {
        id: rsvpId,
        data: submissionData
      };
      
      // שומר בזמני - לא מציג עדיין
      setTempRsvpData(storageData);
      localStorage.setItem('last_submission_time', now.toString());
      
      // פתח את מודאל האימות
      setPendingRsvpId(rsvpId);
      setVerifyingPhone(sanitizedData.phone);
      setOtpModalOpen(true);
      setIsEditing(false);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'אירעה שגיאה בשמירת הטופס. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // פונקציות חדשות לטיפול באימות OTP
  const handleSendOtp = async (): Promise<boolean> => {
    if (!verifyingPhone) return false;
    
    console.log("Sending OTP for verification", {
      phone: verifyingPhone,
      rsvpId: pendingRsvpId,
      isForEdit: verifyingForEdit
    });
    
    try {
      // שליחת בקשה לשרת לשלוח OTP
      const messagePrefix = verifyingForEdit 
        ? "לאישור עדכון הפרטים שלך"
        : "לאישור ההשתתפות שלך בנשף פורים";
      
      const result = await sendOtp({
        phoneNumber: verifyingPhone,
        rsvpId: pendingRsvpId,
        messagePrefix // העברת תוכן מותאם להודעה
      });
      
      console.log("OTP send result:", result);
      
      return true;
    } catch (error) {
      console.error('Error sending OTP:', error);
      
      // להציג יותר מידע על השגיאה אם זמין
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      
      return false;
    }
  };

  const handleVerifyOtp = async (code: string): Promise<boolean> => {
    if (!pendingRsvpId || !verifyingPhone) return false;
    
    console.log(`Verifying OTP code: ${code} for phone: ${verifyingPhone}, RSVP ID: ${pendingRsvpId}`);
    
    try {
      const result = await verifyOtp({
        phoneNumber: verifyingPhone,
        code: code.toString(), // ודא שהקוד מטופל כמחרוזת
        rsvpId: pendingRsvpId
      });
      
      console.log('OTP verification result:', result);
      
      // Type assertion for the response data
      return (result.data as { success: boolean }).success || false;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      
      // להציג יותר מידע על השגיאה אם זמין
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      
      return false;
    }
  };

  const handleVerificationSuccess = () => {
    setOtpModalOpen(false);
    
    if (verifyingForEdit) {
      console.log("אימות הצליח - מעבר למצב עריכה");
      setVerifyingForEdit(false);
      setIsEditing(true);
      return;
    }
    
    if (isExistingUserFromNewDevice) {
      console.log("Showing existing RSVP data after verification");
      setSubmitted(true);
      setIsExistingUserFromNewDevice(false);
      if (onRsvpChange) {
        onRsvpChange(true);
      }
      return;
    }
    
    // רק אחרי אימות מוצלח - שמור ב-localStorage והצג את מסך האישור
    if (tempRsvpData) {
      const verifiedData = {
        ...tempRsvpData,
        data: {
          ...tempRsvpData.data,
          phoneVerified: true,
          phoneVerifiedAt: new Date().toISOString()
        }
      };
      console.log("Saving verified RSVP data:", verifiedData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(verifiedData));
      setStoredRSVP(verifiedData);
      setSubmitted(true);
      if (onRsvpChange) {
        onRsvpChange(true);
      }
    } else if (pendingRsvpId && storedRSVP) {
      // במקרה של אימות מאוחר של רשומה קיימת
      const verifiedData = {
        ...storedRSVP,
        data: {
          ...storedRSVP.data,
          phoneVerified: true,
          phoneVerifiedAt: new Date().toISOString()
        }
      };
      console.log("Updating existing RSVP with verification:", verifiedData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(verifiedData));
      setStoredRSVP(verifiedData);
      setSubmitted(true);
      if (onRsvpChange) {
        onRsvpChange(true);
      }
    }
  };

  const inputClass = clsx(
    "w-full px-6 py-4 bg-black/40 border border-emerald-500/30 rounded-xl",
    "focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
    "text-white placeholder-emerald-300/50 input-glow transition-all duration-300",
    "text-lg"
  );

  if (loadingRSVP) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="mr-3 text-emerald-400">טוען...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* OTP Verification Modal - always include it in the DOM */}
      <OtpVerificationModal
        isOpen={otpModalOpen}
        onClose={() => {
          console.log("Closing OTP modal");
          setOtpModalOpen(false);
          setVerifyingForEdit(false); // Reset this flag when closing without verification
        }}
        phoneNumber={verifyingPhone}
        onVerify={handleVerifyOtp}
        onResendCode={handleSendOtp}
        onSuccess={handleVerificationSuccess}
      />

      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-black/70 p-8 rounded-2xl flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <span className="text-emerald-400">מעבד את הבקשה...</span>
          </div>
        </div>
      )}

      {/* תנאי הבדיקה החדש - נציג את פרטי אישור ההגעה רק אם המשתמש לא במצב עריכה */}
      {(submitted || storedRSVP) && !isEditing ? (
        (() => {
          // הגדרת displayData בתוך IIFE כדי למנוע שגיאות לינטר
          const displayData = storedRSVP?.data || formData;
          const fullName = displayData.fullName || getFullName(displayData.firstName || '', displayData.lastName || '');
          
          return (
            <div className="glass-card rounded-2xl p-12 text-center transform hover:scale-[1.02] transition-all duration-300">
              <div className="inline-block p-4 rounded-full bg-emerald-500/10 mb-6 animate-float">
                <Check className="w-16 h-16 text-emerald-400" />
              </div>
              <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                {isEditing ? 'עריכת פרטי הגעה' : 'מחכים לראות אותך בנשף! 🎭'}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-8">
                {/* שם מלא */}
                <div className="flex items-center gap-3 text-right rtl">
                  <User className="w-5 h-5 text-emerald-400 flex-shrink-0 order-first" />
                  <span className="text-white">{fullName}</span>
                </div>
                
                {/* טלפון */}
                <div className="flex items-center gap-3 text-right rtl">
                  <Phone className="w-5 h-5 text-emerald-400 flex-shrink-0 order-first" />
                  <span className="text-white ltr:text-left rtl:text-right">{displayData.phone}</span>
                </div>
                
                {/* סניף */}
                <div className="flex items-center gap-3 text-right rtl">
                  <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 order-first" />
                  <div>
                    <span className="text-white">
                      {displayData.branchDisplayName || getFullBranchName(displayData.branch)}
                    </span>
                    {displayData.branch && !displayData.customBranch && (
                      <div className="text-emerald-400/80 text-xs">
                        {(() => {
                          const branch = branches.find(b => b.value === displayData.branch);
                          return branch?.address || '';
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* הסעה */}
                <div className="flex items-center gap-3 text-right rtl">
                  <Bus className="w-5 h-5 text-emerald-400 flex-shrink-0 order-first" />
                  <span className="text-white">{displayData.needsTransportation ? 'צריך הסעה' : 'לא צריך הסעה'}</span>
                </div>
                
                {/* סטטוס אימות */}
                <div className="flex items-center gap-3 col-span-1 sm:col-span-2 text-right rtl">
                  {displayData.phoneVerified ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0 order-first" />
                      <span className="text-emerald-300">מאומת</span>
                    </>
                  ) : (
                    <span 
                      className="text-amber-300 flex items-center gap-2 cursor-pointer" 
                      onClick={() => {
                        setVerifyingPhone(displayData.phone);
                        setPendingRsvpId(storedRSVP?.id || '');
                        setOtpModalOpen(true);
                      }}>
                      <AlertCircle className="w-5 h-5 flex-shrink-0 order-first" />
                      <span>לא מאומת (לחץ לאימות)</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        // לפני עריכה, נשלח קוד OTP לאימות
                        console.log("לוחץ על כפתור עדכון פרטים");
                        
                        // הגדר את verifyingForEdit לפני פתיחת המודל
                        setVerifyingForEdit(true);
                        setVerifyingPhone(displayData.phone);
                        setPendingRsvpId(storedRSVP?.id || '');
                        
                        // לוגיקה לשליחת OTP
                        handleSendOtp()
                          .then(success => {
                            console.log("OTP נשלח בהצלחה לצורך עריכה:", success);
                            // פתח את המודל רק אחרי שליחת ה-OTP
                            setOtpModalOpen(true);
                            // לוג מצב עדכני
                            console.log("מצב עריכה:", { verifyingForEdit: true, otpModalOpen: true });
                          })
                      }}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-black transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <Edit className="w-5 h-5" />
                      עדכון פרטים
                    </button>
                    
                    <a
                      href={WAZE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-all duration-300"
                    >
                      <Navigation className="w-4 h-4" />
                      ניווט לאולם
                    </a>
                  </>
                )}
              </div>
            </div>
          );
        })()
      ) : (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 md:p-12">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative group flex-1">
              <User className="absolute top-1/2 right-5 -translate-y-1/2 w-6 h-6 text-emerald-400/70 transition-colors group-hover:text-emerald-400" />
              <input
                type="text"
                required
                className={clsx(inputClass, "pr-14")}
                value={formData.firstName}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // אפשר להקליד רק תווים בעברית, רווחים ומקפים
                  if (newValue === '' || isHebrewOnly(newValue)) {
                    setFormData({ ...formData, firstName: newValue });
                  }
                }}
                placeholder="שם פרטי (בעברית)"
                disabled={isSubmitting}
                dir="rtl"
              />
            </div>
            <div className="relative group flex-1">
              <input
                type="text"
                required
                className={inputClass}
                value={formData.lastName}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // אפשר להקליד רק תווים בעברית, רווחים ומקפים
                  if (newValue === '' || isHebrewOnly(newValue)) {
                    setFormData({ ...formData, lastName: newValue });
                  }
                }}
                placeholder="שם משפחה (בעברית)"
                disabled={isSubmitting}
                dir="rtl"
              />
            </div>
          </div>

          <div className="relative group">
            <Phone className="absolute top-5 right-5 w-6 h-6 text-emerald-400/70 transition-colors group-hover:text-emerald-400" />
            {isEditing && (
              <div className="absolute top-5 left-5 text-amber-300 flex items-center gap-1 flex-row-reverse">
                <Lock className="w-4 h-4" />
                <span className="text-xs mr-1">לא ניתן לשנות</span>
              </div>
            )}
            <input
              type="tel"
              required
              className={clsx(
                inputClass, 
                isEditing ? "pr-14 pl-32" : "pr-14",
                isEditing && "bg-black/60 opacity-60 cursor-not-allowed"
              )}
              value={formData.phone}
              onChange={(e) => {
                if (!isEditing) {
                  const newValue = e.target.value;
                  // מאפשר רק ספרות, מקפים ורווחים בשדה הטלפון
                  if (newValue === '' || /^[\d\s-]+$/.test(newValue)) {
                    setFormData({ ...formData, phone: newValue });
                  }
                }
              }}
              placeholder={isEditing ? "מספר טלפון מאומת" : "מספר טלפון (מתחיל ב-05)"}
              disabled={isSubmitting || isEditing}
              dir="ltr"
            />
          </div>

          <div className="relative group">
            <MapPin className="absolute top-5 right-5 w-6 h-6 text-emerald-400/70 transition-colors group-hover:text-emerald-400" />
            <Select
              options={[
                ...groupedOptions,
                { value: 'custom', label: 'הסניף שלי לא מופיע ברשימה' }
              ]}
              className="branch-select"
              classNamePrefix="branch-select"
              placeholder="בחר/י סניף או הקלד/י לחיפוש"
              formatOptionLabel={(option) => {
                // אם זו אפשרות "הסניף שלי לא מופיע ברשימה"
                if (option.value === 'custom') {
                  return <div>{option.label}</div>;
                }
                
                // אחרת, זה סניף רגיל - נבדוק אם יש לו כתובת
                const branch = branches.find(b => b.value === option.value);
                const address = branch?.address;
                
                return (
                  <div>
                    <div>{option.label}</div>
                    {address && <div className="branch-select__option-address">{address}</div>}
                  </div>
                );
              }}
              onChange={(option: Branch | null) => {
                if (option?.value === 'custom') {
                  setShowCustomBranch(true);
                  setFormData({ ...formData, branch: '', branchDisplayName: '' });
                  setIsBeerSheva(false);
                } else if (option) {
                  const isBS = isBeerShevaBranch(option.value);
                  setShowCustomBranch(false);
                  setIsBeerSheva(isBS);
                  
                  // Get the full branch name with city
                  const selectedBranch = branches.find(b => b.value === option.value);
                  const fullBranchName = selectedBranch && selectedBranch.city ? 
                    `${selectedBranch.label} (${selectedBranch.city})` : 
                    option.label;
                  
                  setFormData({ 
                    ...formData, 
                    branch: option.value,
                    branchDisplayName: fullBranchName, 
                    needsTransportation: isBS ? false : formData.needsTransportation
                  });
                }
              }}
              isDisabled={isSubmitting}
              isSearchable={true}
              noOptionsMessage={() => "לא נמצאו סניפים"}
            />
            <div className="text-emerald-400/70 text-xs mt-1 mr-2">* ניתן לחפש סניף על ידי הקלדת שם</div>
            
            {showCustomBranch && (
              <input
                type="text"
                className={clsx(inputClass, "mt-4")}
                placeholder="שם הסניף"
                value={formData.customBranch || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  customBranch: e.target.value, 
                  branch: e.target.value,
                  branchDisplayName: e.target.value // Save custom branch as display name too
                })}
                disabled={isSubmitting}
              />
            )}
          </div>

          {isBeerSheva && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300 text-sm">שים לב: מסניפי באר שבע לא יוצאות הסעות מאורגנות לאירוע.</p>
            </div>
          )}

          <div className="relative group mt-6">
            <div className={clsx(
              "flex items-center rounded-xl p-4 bg-black/40 border border-emerald-500/30",
              formData.branch && !isBeerSheva ? "cursor-pointer opacity-100" : "opacity-50 cursor-not-allowed",
              formData.needsTransportation && "bg-emerald-500/10"
            )}>
              <input
                type="checkbox"
                id="transportation"
                className="w-6 h-6 rounded-md text-emerald-500 bg-black/50 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                checked={formData.needsTransportation}
                onChange={(e) => {
                  // רק אם נבחר סניף וזה לא באר שבע, ניתן לבחור הסעה
                  if (formData.branch && !isBeerSheva) {
                    setFormData({ ...formData, needsTransportation: e.target.checked });
                  }
                }}
                disabled={!formData.branch || isBeerSheva || isSubmitting}
              />
              <div className="mr-4">
                <label
                  htmlFor="transportation"
                  className={clsx(
                    "block text-lg font-medium cursor-pointer",
                    formData.needsTransportation ? "text-emerald-400" : "text-emerald-400/70"
                  )}
                >
                  אני צריך/ה הסעה
                </label>
                <p className="text-emerald-400/50 text-sm">
                  {isBeerSheva ? 
                    "אין צורך בהסעה מבאר שבע" : 
                    !formData.branch ? 
                    "יש לבחור סניף תחילה כדי לבקש הסעה" : 
                    "הסעות יצאו מהסניפים לאולם וחזרה"}
                </p>
              </div>
              <Bus className={clsx(
                "w-10 h-10 mr-auto",
                formData.needsTransportation ? "text-emerald-400" : "text-emerald-400/30"
              )} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={clsx(
              "w-full py-4 px-8 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl",
              "transition-all duration-300 text-lg font-medium mt-8",
              "focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
              !isSubmitting && "hover:from-emerald-500 hover:to-emerald-400 transform hover:-translate-y-1",
              isSubmitting && "opacity-75 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                שולח...
              </span>
            ) : (
              isEditing ? 'שמירת שינויים' : 'אישור הגעה'
            )}
          </button>
        </form>
      )}
    </>
  );
}

export default RSVPForm;