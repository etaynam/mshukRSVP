import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        };
      }
      
      // חישוב הזמן הנותר
      let totalSeconds = Math.floor(difference / 1000);
      
      const days = Math.floor(totalSeconds / (60 * 60 * 24));
      totalSeconds -= days * 60 * 60 * 24;
      
      const hours = Math.floor(totalSeconds / (60 * 60));
      totalSeconds -= hours * 60 * 60;
      
      const minutes = Math.floor(totalSeconds / 60);
      totalSeconds -= minutes * 60;
      
      const seconds = totalSeconds;
      
      return {
        days,
        hours,
        minutes,
        seconds
      };
    };

    // עדכון הספירה לאחור בכל שנייה
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // חישוב ראשוני
    setTimeLeft(calculateTimeLeft());

    // ניקוי
    return () => clearInterval(timer);
  }, [targetDate]);

  // פונקציה להצגת ספרה כשתי ספרות (עם אפס מוביל)
  const formatNumber = (num: number) => {
    return num.toString().padStart(2, '0');
  };

  return (
    <div className="countdown-container mb-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
      <div className="flex items-center justify-center gap-2 text-center">
        {/* הסדר החדש: שניות-דקות-שעות-ימים (משמאל לימין) */}
        
        {/* שניות */}
        <div className="countdown-item">
          <div className="bg-black/40 px-3 py-3 rounded-lg border border-emerald-500/30 min-w-14 backdrop-blur-sm animate-pulse">
            <span className="text-2xl md:text-4xl font-bold text-white">{formatNumber(timeLeft.seconds)}</span>
          </div>
          <div className="text-xs md:text-sm text-emerald-400/70 mt-1">שניות</div>
        </div>

        <div className="text-emerald-500 text-xl font-bold mx-0">:</div>
        
        {/* דקות */}
        <div className="countdown-item">
          <div className="bg-black/40 px-3 py-3 rounded-lg border border-emerald-500/30 min-w-14 backdrop-blur-sm">
            <span className="text-2xl md:text-4xl font-bold text-white">{formatNumber(timeLeft.minutes)}</span>
          </div>
          <div className="text-xs md:text-sm text-emerald-400/70 mt-1">דקות</div>
        </div>

        <div className="text-emerald-500 text-xl font-bold mx-0">:</div>
        
        {/* שעות */}
        <div className="countdown-item">
          <div className="bg-black/40 px-3 py-3 rounded-lg border border-emerald-500/30 min-w-14 backdrop-blur-sm">
            <span className="text-2xl md:text-4xl font-bold text-white">{formatNumber(timeLeft.hours)}</span>
          </div>
          <div className="text-xs md:text-sm text-emerald-400/70 mt-1">שעות</div>
        </div>

        <div className="text-emerald-500 text-xl font-bold mx-0">:</div>
        
        {/* ימים */}
        <div className="countdown-item">
          <div className="bg-black/40 px-3 py-3 rounded-lg border border-emerald-500/30 min-w-14 backdrop-blur-sm">
            <span className="text-2xl md:text-4xl font-bold text-white">{formatNumber(timeLeft.days)}</span>
          </div>
          <div className="text-xs md:text-sm text-emerald-400/70 mt-1">ימים</div>
        </div>
      </div>
      
      {/* קו מפריד תואם לקו שמעל הטיימר */}
      <div className="w-full max-w-md mx-auto h-px bg-emerald-500/30 mt-6"></div>
    </div>
  );
};

export default CountdownTimer; 