import React, { useState, useEffect } from 'react';
import { getLogoUrl } from '../lib/firebase';
import { Loader2, Star } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

interface EventClosedPageProps {
  // ניתן להפעיל את הדף באופן כפוי דרך פאנל הניהול
  forceShow?: boolean;
  // אפשרות להציג את המצב שאחרי האירוע לתצוגה מקדימה
  previewAfterEvent?: boolean;
}

const EventClosedPage: React.FC<EventClosedPageProps> = ({ 
  forceShow = false,
  previewAfterEvent = false
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [shouldShow, setShouldShow] = useState(forceShow);
  const [isEventDay, setIsEventDay] = useState(false);

  useEffect(() => {
    // בדיקה אם צריך להציג את הדף על פי התאריך
    const checkEventStatus = () => {
      const now = new Date();
      
      // תאריך האירוע - 23/03/2025
      const eventDate = new Date('2025-03-23T17:00:00');
      
      // תאריך סיום האירוע - 24/03/2025
      const afterEventDate = new Date('2025-03-24T00:00:00');
      
      if (forceShow) {
        setShouldShow(true);
        // אם נדרשת תצוגה מקדימה של מצב אחרי האירוע
        if (previewAfterEvent) {
          setIsEventDay(false); // להציג את המצב שאחרי האירוע
        } else {
          setIsEventDay(now < afterEventDate);
        }
        return;
      }
      
      // אם התאריך הנוכחי גדול או שווה לתאריך האירוע
      if (now >= eventDate) {
        setShouldShow(true);
        // אם זה עדיין יום האירוע או שזה כבר אחרי
        setIsEventDay(now < afterEventDate);
      } else {
        setShouldShow(false);
      }
    };

    checkEventStatus();
    
    // טעינת הלוגו
    const loadLogo = async () => {
      try {
        const url = await getLogoUrl();
        setLogoUrl(url);
        
        // טעינה מוקדמת של התמונה
        const img = new Image();
        img.src = url;
        img.onload = () => {
          setTimeout(() => {
            setIsLoading(false);
            setTimeout(() => setShowContent(true), 100);
          }, 300);
        };
      } catch (error) {
        console.error('Error loading logo:', error);
        setIsLoading(false);
      }
    };

    loadLogo();
  }, [forceShow, previewAfterEvent]);

  if (!shouldShow) {
    // אם לא צריך להציג את הדף, מחזירים null
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-mesh min-h-screen w-full absolute inset-0" />
        <div className="loading-container flex flex-col items-center gap-8 relative z-10">
          <div className="loading-ring"></div>
          <div className="text-emerald-400/80 text-lg">טוען...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      "min-h-screen bg-black text-white overflow-hidden transition-opacity duration-500",
      showContent ? "opacity-100" : "opacity-0"
    )}>
      <div className="bg-mesh min-h-screen py-12 px-4 relative">
        {/* Admin Link - אייקון כוכבית שמוביל לפאנל הניהול */}
        <Link 
          to="/admin" 
          className="absolute top-4 right-4 text-emerald-500/30 hover:text-emerald-500/50 transition-colors"
          aria-label="פאנל ניהול"
        >
          <Star className="w-5 h-5" />
        </Link>

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-glow"></div>
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-glow" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center justify-center min-h-[80vh]">
          <div className="text-center mb-12">
            <div className="inline-block animate-float">
              {logoUrl && (
                <img 
                  src={logoUrl}
                  alt="נשף פורים 2025" 
                  className="w-64 md:w-80 h-auto mx-auto"
                />
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-10 text-center transform hover:scale-[1.02] transition-all duration-300 max-w-xl">
            <div className="inline-block p-6 rounded-full bg-emerald-500/10 mb-8 animate-pulse">
              {isEventDay ? (
                <Loader2 className="w-16 h-16 text-emerald-400 animate-spin" />
              ) : (
                <div className="w-16 h-16 text-emerald-400 flex items-center justify-center text-5xl">🎭</div>
              )}
            </div>
            
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              {isEventDay ? 'נשף פורים 2025 מתקיים היום!' : 'נשף פורים 2025 הסתיים!'}
            </h1>
            
            <p className="text-xl text-white/80 mb-8">
              {isEventDay ? (
                'נשמח לפגוש את עובדי הרשת באולמי "סופיה", יצחק סלמה 1, באר שבע, החל מהשעה 19:30.'
              ) : (
                'תודה לכל עובדי הרשת שלקחו חלק באירוע המרהיב! נתראה בשנה הבאה 🥳'
              )}
            </p>
            
            {isEventDay && (
              <div className="text-center mb-6">
                <div className="inline-block border-b-2 border-emerald-500/30 pb-4 md:pb-6 mb-6 md:mb-8">
                  <div className="flex items-center justify-center gap-2 md:gap-6 text-4xl md:text-7xl mb-4 date-display">
                    <span>2025</span>
                    <span className="text-emerald-400">/</span>
                    <span>03</span>
                    <span className="text-emerald-400">/</span>
                    <span>23</span>
                  </div>
                  
                  <div className="text-base md:text-lg text-emerald-300/80">
                    יום ראשון כ״ג באדר התשפ״ה
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Signature */}
          <div className="mt-16">
            <div className="flex items-center gap-4 bg-emerald-950/50 backdrop-blur-sm px-6 py-3 rounded-full">
              <p className="text-xs text-emerald-400/60">מחלקת שיווק ופרסום:</p>
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/shukpurim-3fa95.firebasestorage.app/o/assets%2Fsignature.png?alt=media"
                alt="מחלקת שיווק ופרסום"
                className="w-[200px] opacity-60"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventClosedPage; 