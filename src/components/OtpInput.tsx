import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // התחל עם מערך באורך length
  useEffect(() => {
    inputsRef.current = inputsRef.current.slice(0, length);
  }, [length]);

  // מיקוד אוטומטי בשדה הבא/קודם
  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < length) {
      inputsRef.current[activeIndex]?.focus();
    }
  }, [activeIndex, length]);

  // פיצול הערך לתווים נפרדים
  const valueArray = value.split('');

  // טיפול בשינוי ערך בשדה
  const handleChange = (index: number, digit: string) => {
    if (disabled) return;

    // מוודא שמדובר בספרה
    if (!/^\d*$/.test(digit)) return;
    
    const newValue = [...valueArray];
    
    if (digit.length === 1) {
      // אם המשתמש הזין ספרה אחת חדשה
      newValue[index] = digit;
      onChange(newValue.join(''));
      
      // ואז עבור לשדה הבא
      if (index < length - 1) {
        setActiveIndex(index + 1);
      }
    } else if (digit.length === 6) {
      // במקרה של הדבק קוד מלא
      const pastedDigits = digit.slice(0, length).split('');
      onChange(pastedDigits.join(''));
    }
  };

  // טיפול בלחיצות מקלדת
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    // משתמש מחק - עבור לשדה הקודם
    if (e.key === 'Backspace' && !valueArray[index] && index > 0) {
      setActiveIndex(index - 1);
      
      // מחק את הערך בשדה הקודם
      const newValue = [...valueArray];
      newValue[index - 1] = '';
      onChange(newValue.join(''));
    }
    
    // מקשי חיצים
    if (e.key === 'ArrowLeft' && index > 0) {
      setActiveIndex(index - 1);
      e.preventDefault();
    }
    
    if (e.key === 'ArrowRight' && index < length - 1) {
      setActiveIndex(index + 1);
      e.preventDefault();
    }
  };

  // טיפול בהדבקת קוד
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // רק אם הודבקו ספרות
    if (/^\d+$/.test(pastedData)) {
      const pastedDigits = pastedData.slice(0, length).split('');
      onChange(pastedDigits.join(''));
    }
  };

  return (
    <div className="flex justify-center gap-2 mx-auto max-w-xs" dir="ltr">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1} // מאפשר ספרה אחת בלבד בכל תא
          value={valueArray[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => setActiveIndex(index)}
          className={clsx(
            "w-11 h-14 text-xl text-center rounded-lg transition-all duration-200",
            "border bg-black/30",
            valueArray[index]
              ? "border-emerald-500 text-white" 
              : "border-emerald-500/30 text-white/70",
            disabled && "opacity-60 cursor-not-allowed",
            activeIndex === index && !disabled && "border-emerald-400 ring-2 ring-emerald-500/20"
          )}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default OtpInput; 