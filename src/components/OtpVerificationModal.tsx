import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import Modal from './Modal';
import OtpInput from './OtpInput';
import { CheckCircle2, AlertCircle, MessageSquareText, AlertTriangle } from 'lucide-react';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onVerify: (code: string) => Promise<boolean>;
  onResendCode: () => Promise<boolean>;
  onSuccess: () => void;
  onBypassVerification?: () => void;
}

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  onVerify,
  onResendCode,
  onSuccess,
  onBypassVerification
}) => {
  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const [showBypassConfirm, setShowBypassConfirm] = useState(false);
  
  // הצגה מיידית של מודאל לשליחת קוד בפתיחה
  useEffect(() => {
    if (isOpen) {
      setOtpValue('');
      setError(null);
      setSuccess(false);
      setCountdown(60);
      setShowBypassConfirm(false);
      handleResendCode();
    }
  }, [isOpen]);

  // ספירה לאחור להרשאת שליחה חוזרת
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown, isOpen]);

  // פונקציה לאימות הקוד
  const handleVerify = async () => {
    if (otpValue.length !== 6) return;
    
    setLoading(true);
    setError(null);
    
    // לוודא שהקוד הוא מחרוזת
    const cleanOtpValue = otpValue.trim();
    
    console.log(`Attempting to verify OTP: ${cleanOtpValue}, length: ${cleanOtpValue.length}`);
    
    try {
      const verified = await onVerify(cleanOtpValue);
      
      if (verified) {
        console.log('OTP verification successful');
        setSuccess(true);
        // השהייה קצרה להצגת אנימציית ההצלחה
        setTimeout(() => {
          console.log("Calling onSuccess callback from modal");
          onSuccess();
          // הוספנו שהייה קצרה לפני סגירת המודל
          setTimeout(() => {
            console.log("Closing modal after successful verification");
            onClose();
          }, 500);
        }, 1000);
      } else {
        console.error('OTP verification failed');
        setError('קוד שגוי, אנא נסה שנית');
      }
    } catch (err) {
      console.error('Error during OTP verification:', err);
      setError('אירעה שגיאה בעת אימות הקוד, אנא נסה שנית');
    } finally {
      setLoading(false);
    }
  };

  // פונקציה לשליחת קוד חדש
  const handleResendCode = async () => {
    if (countdown > 0 && countdown !== 60) return;
    
    setResending(true);
    setError(null);
    
    try {
      const sent = await onResendCode();
      
      if (sent) {
        setCountdown(60);
      } else {
        setError('לא הצלחנו לשלוח קוד חדש, אנא נסה שנית מאוחר יותר');
      }
    } catch (err) {
      setError('אירעה שגיאה בעת שליחת הקוד החדש');
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  // פונקציה חדשה לעקיפת אימות
  const handleBypass = () => {
    if (showBypassConfirm) {
      // המשתמש אישר את העקיפה
      if (onBypassVerification) {
        console.log('Bypassing OTP verification');
        setSuccess(true);
        setTimeout(() => {
          onBypassVerification();
          onClose();
        }, 1000);
      }
    } else {
      // הצג את חלון האישור תחילה
      setShowBypassConfirm(true);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="אימות מספר טלפון"
    >
      <div className="p-6 space-y-6">
        {success ? (
          // תצוגת הצלחה
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-pulse" />
            <h3 className="text-xl font-semibold text-white">האימות הושלם בהצלחה!</h3>
            <p className="text-white/70 text-center">אישור ההגעה שלך נרשם במערכת</p>
          </div>
        ) : showBypassConfirm ? (
          // תצוגת אישור עקיפת אימות
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-white text-center">
              האם אתה בטוח שברצונך להמשיך ללא אימות?
            </h3>
            <p className="text-white/70 text-center">
              אימות מספר הטלפון מסייע לנו לאמת את פרטי ההרשמה ולמנוע טעויות.
            </p>
            
            <div className="flex flex-col sm:flex-row w-full gap-4 mt-4">
              <button
                onClick={() => setShowBypassConfirm(false)}
                className="bg-gray-600 hover:bg-gray-500 text-white py-3 px-5 rounded-lg transition-all flex-1"
              >
                חזרה לאימות
              </button>
              <button
                onClick={handleBypass}
                className="bg-amber-600 hover:bg-amber-500 text-white py-3 px-5 rounded-lg transition-all flex-1"
              >
                המשך ללא אימות
              </button>
            </div>
          </div>
        ) : (
          // תצוגת הזנת קוד
          <>
            <div className="flex flex-col items-center justify-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <MessageSquareText className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-white/80 text-center">
                שלחנו קוד אימות בן 6 ספרות למספר
              </p> 
              <p className="text-xl text-white font-medium" dir="ltr">{phoneNumber}</p>
              <p className="text-white/70 text-center text-sm">
                אנא הקלד את הקוד שקיבלת ב-SMS כדי להשלים את אישור ההגעה
              </p>
            </div>
            
            <div className="my-8">
              <OtpInput
                value={otpValue}
                onChange={setOtpValue}
                disabled={loading || success}
              />
            </div>
            
            {error && (
              <div className="flex items-center gap-2 justify-center bg-red-500/10 text-red-400 p-3 rounded-lg text-sm my-4">
                <AlertCircle className="flex-shrink-0 w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="flex flex-col gap-4 mt-8">
              <button
                onClick={handleVerify}
                disabled={otpValue.length !== 6 || loading || success}
                className={clsx(
                  "bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-5 rounded-lg transition-all",
                  "disabled:bg-emerald-600/50 disabled:cursor-not-allowed",
                  loading && "animate-pulse"
                )}
              >
                {loading ? 'מאמת...' : 'אימות קוד'}
              </button>
              
              <button
                onClick={handleResendCode}
                disabled={countdown > 0 || resending || loading || success}
                className={clsx(
                  "text-emerald-400 hover:text-emerald-300 text-sm py-2 transition-colors",
                  countdown > 0 && "text-emerald-500/50 cursor-not-allowed"
                )}
              >
                {resending
                  ? 'שולח...'
                  : countdown > 0
                  ? `שלח קוד חדש (${countdown})`
                  : 'שלח קוד חדש'}
              </button>
              
              {onBypassVerification && (
                <button
                  onClick={handleBypass}
                  className="mt-4 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 font-medium py-3 px-5 rounded-lg transition-all border border-amber-500/30"
                >
                  לא קיבלתי קוד - המשך ללא אימות
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default OtpVerificationModal; 