import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { MapPin, Phone, User, Bus, CheckCircle2, Loader2, Edit, Check, Navigation, AlertCircle } from 'lucide-react';
import { branches } from '../data/branches';
import { RSVPFormData, Branch, StoredRSVP } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, query, where, getDocs, getDoc } from 'firebase/firestore';
import clsx from 'clsx';

const STORAGE_KEY = 'purim_party_rsvp';
const SUBMISSION_COOLDOWN = 60 * 1000; // 1 minute cooldown
const WAZE_URL = 'https://waze.com/ul/hsv89xuh1z';

// Group branches by city
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
  return branch?.city === "ב״ש";
};

// Helper function to get full branch name with city if available
const getFullBranchName = (branchValue: string): string => {
  const branch = branches.find(b => b.value === branchValue);
  if (!branch) return branchValue;
  
  return branch.city ? `${branch.label} (${branch.city})` : branch.label;
};

const RSVPForm: React.FC = () => {
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
          } else {
            // RSVP was deleted, remove from local storage
            localStorage.removeItem(STORAGE_KEY);
            setStoredRSVP(null);
            setSubmitted(false);
          }
        } catch (error) {
          console.error("Error checking RSVP existence:", error);
          // On error, assume RSVP doesn't exist
          localStorage.removeItem(STORAGE_KEY);
          setStoredRSVP(null);
          setSubmitted(false);
        } finally {
          setLoadingRSVP(false);
        }
      };
      
      checkRSVPExists();
    } else {
      setLoadingRSVP(false);
    }
  }, [isEditing]);

  // Helper to get full name from first and last name
  const getFullName = (first: string, last: string): string => {
    return `${first} ${last}`.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Check for existing RSVP with the same phone number
      const rsvpsRef = collection(db, 'rsvps');
      const q = query(rsvpsRef, where('phone', '==', formData.phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Found existing RSVP with this phone number
        const existingRSVP = {
          id: querySnapshot.docs[0].id,
          data: querySnapshot.docs[0].data() as RSVPFormData
        };
        
        // Store in localStorage and show success state
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existingRSVP));
        setStoredRSVP(existingRSVP);
        setSubmitted(true);
        setIsSubmitting(false);
        return;
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
        ...formData,
        fullName: getFullName(formData.firstName, formData.lastName),
        submittedAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
      };

      let rsvpId: string;
      
      if (isEditing && storedRSVP) {
        // Update existing RSVP
        await updateDoc(doc(db, 'rsvps', storedRSVP.id), submissionData);
        rsvpId = storedRSVP.id;
      } else {
        // Create new RSVP
        const docRef = await addDoc(collection(db, 'rsvps'), submissionData);
        rsvpId = docRef.id;
      }

      // Store in localStorage
      const storageData: StoredRSVP = {
        id: rsvpId,
        data: submissionData
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
      localStorage.setItem('last_submission_time', now.toString());

      setStoredRSVP(storageData);
      setSubmitted(true);
      setIsEditing(false);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'אירעה שגיאה בשמירת הטופס. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
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

  if (submitted || (storedRSVP && !isEditing)) {
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
        
        <div className="space-y-4 text-right mb-8">
          <div>
            <span className="text-emerald-400">שם מלא:</span>
            <span className="text-white mr-2">{fullName}</span>
          </div>
          <div>
            <span className="text-emerald-400">טלפון:</span>
            <span className="text-white mr-2">{displayData.phone}</span>
          </div>
          <div>
            <span className="text-emerald-400">סניף:</span>
            <span className="text-white mr-2">
              {displayData.branchDisplayName || getFullBranchName(displayData.branch)}
            </span>
          </div>
          <div>
            <span className="text-emerald-400">הסעה:</span>
            <span className="text-white mr-2">{displayData.needsTransportation ? 'כן' : 'לא'}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all duration-300"
              >
                <Edit className="w-4 h-4" />
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
  }

  return (
    <div className="glass-card rounded-2xl p-8 md:p-12 transform hover:scale-[1.02] transition-all duration-300">
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative group flex-1">
            <User className="absolute top-1/2 right-5 -translate-y-1/2 w-6 h-6 text-emerald-400/70 transition-colors group-hover:text-emerald-400" />
            <input
              type="text"
              required
              className={clsx(inputClass, "pr-14")}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="שם פרטי (בעברית)"
              disabled={isSubmitting}
            />
          </div>
          <div className="relative group flex-1">
            <input
              type="text"
              required
              className={inputClass}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="שם משפחה (בעברית)"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="relative group">
          <Phone className="absolute top-1/2 right-5 -translate-y-1/2 w-6 h-6 text-emerald-400/70 transition-colors group-hover:text-emerald-400" />
          <input
            type="tel"
            required
            className={clsx(inputClass, "pr-14")}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="מספר טלפון"
            disabled={isSubmitting}
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
            placeholder="בחר/י סניף"
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

        <div 
          className={clsx(
            "flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
            "bg-black/20 border-2",
            isBeerSheva ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            formData.needsTransportation 
              ? "border-emerald-500/50 bg-emerald-500/10" 
              : "border-emerald-500/20 hover:border-emerald-500/40"
          )}
          onClick={() => {
            if (!isBeerSheva) {
              setFormData(prev => ({ ...prev, needsTransportation: !prev.needsTransportation }));
            }
          }}
        >
          <div className={clsx(
            "w-6 h-6 rounded-lg transition-all duration-300 flex items-center justify-center",
            formData.needsTransportation 
              ? "bg-emerald-500 text-black" 
              : "border-2 border-emerald-500/30"
          )}>
            {formData.needsTransportation && <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Bus className={clsx(
              "w-6 h-6 transition-colors duration-300",
              formData.needsTransportation ? "text-emerald-400" : "text-emerald-400/70"
            )} />
            <span className={clsx(
              "text-lg transition-colors duration-300",
              formData.needsTransportation ? "text-emerald-400" : "text-emerald-400/70"
            )}>
              אני צריך/ה הסעה
            </span>
          </div>
        </div>

        {formData.needsTransportation && (
          <p className="text-sm text-emerald-400/80 pr-10 -mt-2">
            * ההסעה תצא מהסניף שבחרת
          </p>
        )}

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
    </div>
  );
}

export default RSVPForm;