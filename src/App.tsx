import React, { useState, useEffect } from 'react';
import { ChevronDown, Sparkles, Music4, Award, Clock, MapPin } from 'lucide-react';
import RSVPForm from './components/RSVPForm';
import { getLogoUrl } from './lib/firebase';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import EventClosedPage from './pages/EventClosedPage';
import CountdownTimer from './components/CountdownTimer';

function App() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [userHasRsvp, setUserHasRsvp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [eventClosed, setEventClosed] = useState(false);
  // תאריך האירוע - 23/03/2025 בשעה 19:30
  const eventDate = new Date('2025-03-23T19:30:00');

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const url = await getLogoUrl();
        setLogoUrl(url);
        
        // Preload the image
        const img = new Image();
        img.src = url;
        img.onload = () => {
          // Add a small delay for smooth transition
          setTimeout(() => {
            setIsLoading(false);
            setTimeout(() => setShowContent(true), 100);
          }, 500);
        };
      } catch (error) {
        console.error('Error loading logo:', error);
        setIsLoading(false);
      }
    };

    loadLogo();

    // Check if the event is closed from Firestore settings
    const checkEventStatus = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'event'));
        const data = settingsDoc.data();
        if (data && data.closed) {
          setEventClosed(true);
        }
      } catch (error) {
        console.error('Error checking event status:', error);
      }
    };
    
    checkEventStatus();

    // Check if user has already RSVP'd
    const storedRsvp = localStorage.getItem('purim_party_rsvp');
    setUserHasRsvp(!!storedRsvp);

    const handleScroll = () => {
      const formElement = document.getElementById('rsvp-form');
      if (formElement) {
        const rect = formElement.getBoundingClientRect();
        setShowScrollHint(rect.top > window.innerHeight);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // אם האירוע נסגר, נציג את עמוד האירוע נסגר
  if (eventClosed) {
    return <EventClosedPage forceShow={true} />;
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
        {/* Admin Link */}
        <Link 
          to="/admin" 
          className="absolute top-4 right-4 text-emerald-500/30 hover:text-emerald-500/50 transition-colors"
          aria-label="פאנל ניהול"
        >
          <Sparkles className="w-5 h-5" />
        </Link>

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-glow"></div>
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-glow" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-4">
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

          {/* Scroll Indicator */}
          <div className="flex flex-col items-center mb-8 md:mb-12 animate-bounce-slow">
            <span className="text-[#FFDC6C] text-sm mb-2">לצפייה בפרטי הנשף גלול/י למטה</span>
            <div className="relative">
              <div className="absolute inset-0 bg-[#FFDC6C]/20 rounded-full blur-md"></div>
              <ChevronDown className="w-8 h-8 text-[#FFDC6C] relative z-10" />
            </div>
          </div>

          <div className="glass-gradient rounded-2xl p-4 md:p-8 mb-8 md:mb-12 transform hover:scale-[1.02] transition-transform duration-300">
            <div className="text-center">
              <div className="inline-block border-b-2 border-emerald-500/30 pb-4 md:pb-6 mb-6 md:mb-8">
                <div className="flex items-center justify-center gap-2 md:gap-6 text-4xl md:text-7xl mb-4 date-display animate-date-appear">
                  <span>2025</span>
                  <span className="text-emerald-400">/</span>
                  <span>03</span>
                  <span className="text-emerald-400">/</span>
                  <span>23</span>
                </div>
                
                <div className="text-base md:text-lg text-emerald-300/80 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  יום ראשון כ״ג באדר התשפ״ה
                </div>
              </div>

              {/* קאונטדאון ספירה לאחור */}
              <CountdownTimer targetDate={eventDate} />

              {/* שורה ראשונה: שעה ומקום */}
              <div className="grid grid-cols-2 gap-6 md:gap-8 mt-8">
                {/* שעה */}
                <div className="animate-fade-in relative pt-12 pb-4" style={{ animationDelay: '0.7s' }}>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-light bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                    19:30
                  </div>
                  <div className="text-sm text-emerald-400 mt-1">פתיחת האירוע</div>
                </div>

                {/* מקום */}
                <div className="animate-fade-in relative pt-12 pb-4" style={{ animationDelay: '0.8s' }}>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-light bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                    אולמי "סופיה"
                  </div>
                  <div className="text-sm text-emerald-400 mt-1">יצחק סלמה 1, באר שבע</div>
                </div>
              </div>

              {/* שורה שניה: אמן אורח ותחרות תחפושות */}
              <div className="grid grid-cols-2 gap-6 md:gap-8 mt-12">
                {/* אמן אורח */}
                <div className="animate-fade-in relative pt-12 pb-4" style={{ animationDelay: '0.9s' }}>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Music4 className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-light bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                    אומן אורח
                  </div>
                  <div className="text-sm text-emerald-400 mt-1">שיעיף את הרחבה</div>
                </div>

                {/* תחרות תחפושות */}
                <div className="animate-fade-in relative pt-12 pb-4" style={{ animationDelay: '1s' }}>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Award className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-light bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                    תחרות תחפושות
                  </div>
                  <div className="text-sm text-emerald-400 mt-1">נושאת פרסים!</div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 md:p-8 mb-8 md:mb-16">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 shadow-inner shadow-amber-500/5">
              <p className="text-amber-400 font-medium text-center">
              כדי לאפשר אווירה כיפית ומגבשת במיוחד, הנשף השנה יתקיים לעובדים בלבד, ללא בני/בנות זוג.
              <br />
              מחכים לכם לערב מלא חוויות, שמחה ואווירה מיוחדת
              </p>
            </div>
          </div>

          {/* כותרת אישור הגעה - מוצגת רק אם אין עדיין רישום */}
          {!userHasRsvp && (
            <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: '0.7s' }}>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent mb-2">
                אשרו את הגעתכם עכשיו!
              </h2>
              <p className="text-emerald-400/70">
                כדי שנוכל להיערך כראוי ולשמור לכם מקום, אנא מלאו את הטופס
              </p>
            </div>
          )}

          <div id="rsvp-form">
            <RSVPForm onRsvpChange={setUserHasRsvp} />
          </div>

          {/* Footer Image and Signature */}
          <div className="mt-16 md:mt-24 pb-8">
            <div className="flex flex-col items-center gap-12">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/shukpurim-3fa95.firebasestorage.app/o/assets%2Flogoticket.png?alt=media"
                alt="כרטיס נשף פורים"
                className="w-[250px] rounded-2xl shadow-2xl shadow-emerald-500/10"
              />
              
              {/* Marketing Signature and Credits */}
              <div className="flex items-center gap-4 bg-emerald-950/50 backdrop-blur-sm px-6 py-3 rounded-full">
                <p className="text-xs text-emerald-400/60">עיצוב ופיתוח:</p>
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/shukpurim-3fa95.firebasestorage.app/o/assets%2Fsignature.png?alt=media"
                  alt="מחלקת שיווק ופרסום"
                  className="w-[200px] opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Sticky RSVP Hint */}
          {showScrollHint && (
            <div className="fixed bottom-0 left-0 right-0 bg-emerald-900/90 backdrop-blur-lg border-t border-emerald-500/20 shadow-lg shadow-emerald-900/50 transition-all duration-300 z-50">
              <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                {userHasRsvp ? (
                  <>
                    <span className="text-emerald-100">נשמח לראות אותך בנשף! 🎭</span>
                    <button 
                      onClick={() => {
                        document.getElementById('rsvp-form')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-6 py-2 rounded-full transition-colors duration-300 text-sm font-medium"
                    >
                      צפייה בפרטי האישור
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-emerald-100">מגיע/ה לנשף? אשר/י הגעה</span>
                    <button 
                      onClick={() => {
                        document.getElementById('rsvp-form')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2 rounded-full transition-colors duration-300 text-sm font-medium"
                    >
                      לאישור הגעה
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;