import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import App from './App.tsx';
import AdminLogin from './pages/AdminLogin.tsx';
import AdminPanel from './pages/AdminPanel.tsx';
import EventClosedPage from './pages/EventClosedPage.tsx';
import './index.css';

// השתקת הקונסול לסביבת הפרודקשן
if (import.meta.env.PROD) {
  const noop = () => {};
  
  // שומרים על גישה למתודות קריטיות במקרה של שגיאות חמורות
  const originalError = console.error;
  
  // החלפת כל מתודות הקונסול בפונקציות ריקות
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
  console.trace = noop;
  console.dir = noop;
  console.dirxml = noop;
  console.count = noop;
  console.countReset = noop;
  console.time = noop;
  console.timeEnd = noop;
  console.timeLog = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
  console.table = noop;
  
  // שומרים על console.error עם פילטור להודעות פיתוח
  console.error = function(...args) {
    // אופציונלי: ניתן להוסיף פילטור למקרים שבהם רוצים בכל זאת לראות שגיאות מסוימות
    // אם ההודעה נראית כמו שגיאה קריטית, נשלח אותה למקור
    const errorMsg = args[0]?.toString?.() || '';
    if (
      errorMsg.includes('Uncaught') || 
      errorMsg.includes('unhandled') || 
      errorMsg.includes('Fatal')
    ) {
      originalError.apply(console, args);
    }
  };
}

// מרכיב עוטף לדף event-closed שקורא את פרמטרי ה-query
const EventClosedWrapper = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const afterEvent = searchParams.get('afterEvent') === 'true';
  
  return <EventClosedPage forceShow={true} previewAfterEvent={afterEvent} />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/event-closed" element={<EventClosedWrapper />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminPanel />} />
      </Routes>
    </Router>
  </StrictMode>
);