# 🎭 מערכת אישורי הגעה לנשף פורים

מערכת ניהול אישורי הגעה מודרנית ויפה המיועדת לנשף פורים של הארגון. המערכת מאפשרת למשתמשים לאשר הגעה, לבקש הסעה ולמנהלים לעקוב אחר רשימת המשתתפים.

![screenshot](https://firebasestorage.googleapis.com/v0/b/shukpurim-3fa95.firebasestorage.app/o/assets%2Flogosimple.png?alt=media)

## ✨ תכונות עיקריות

- 📝 **טופס אישור הגעה** - ממשק משתמש אינטואיטיבי וקל לשימוש
- 🚌 **מערכת הסעות** - ניהול בקשות להסעות מסניפים שונים
- 👑 **פאנל ניהול** - ממשק אדמין מאובטח לניהול אישורי ההגעה
- 📊 **ייצוא נתונים** - ייצוא רשימת המשתתפים לקובץ CSV
- 📱 **תמיכה במובייל** - ממשק מותאם למסכים בכל הגדלים
- 🎨 **עיצוב מודרני** - עיצוב מרהיב בסגנון ניאון/גלאס עם אנימציות

## 🛠️ טכנולוגיות

- 🔥 **Firebase** - אחסון נתונים וניהול משתמשים
- ⚛️ **React** - ספריית ממשק משתמש
- 🌐 **TypeScript** - תמיכה בטיפוסים לפיתוח בטוח יותר
- 🎨 **Tailwind CSS** - עיצוב מודרני וריספונסיבי
- 🚀 **Vite** - פיתוח מהיר וחוויית פיתוח משופרת
- 🌐 **Netlify** - אירוח והפצה

## 🚀 התקנה והפעלה

### דרישות מוקדמות

- Node.js (גרסה 16 ומעלה)
- npm או yarn
- חשבון Firebase

### התקנה

1. שכפל את המאגר:
```bash
git clone https://github.com/etaynam/mshukRSVP.git
cd mshukRSVP
```

2. התקן את התלויות:
```bash
npm install
```

3. הגדר את משתני הסביבה:
   - צור קובץ `.env` בתיקיית הפרויקט
   - הוסף את פרטי התצורה של Firebase שלך:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. הפעל את הפרויקט במצב פיתוח:
```bash
npm run dev
```

### בנייה לייצור

כדי לבנות את האפליקציה לסביבת ייצור:

```bash
npm run build
```

התוצאות יישמרו בתיקיית `dist`.

## 🔓 פאנל מנהל

1. גש לנתיב `/admin` כדי להגיע לעמוד ההתחברות של המנהל
2. התחבר עם האימייל והסיסמה שהוגדרו בפיירבייס
3. נהל את אישורי ההגעה, בצע עריכות, ויצא את הנתונים לפי הצורך

## 📋 מבנה הפרויקט

```
├── src/                  # קוד המקור
│   ├── components/       # רכיבי React
│   ├── data/             # נתונים סטטיים (סניפים וכו')
│   ├── lib/              # תשתיות (Firebase וכו')
│   ├── pages/            # דפים ראשיים
│   ├── App.tsx           # רכיב ראשי
│   ├── main.tsx          # נקודת הכניסה למערכת
│   └── types.ts          # הגדרות טיפוסים
├── public/               # קבצים סטטיים
├── firestore.rules       # חוקי אבטחה לפיירסטור
├── storage.rules         # חוקי אבטחה לאחסון פיירבייס
└── package.json          # תלויות ופקודות
```

## 🔐 הרשאות וחוקי אבטחה

המערכת משתמשת בחוקי אבטחה של Firebase:

- **קריאה**: כל משתמש יכול לקרוא אישורי הגעה
- **יצירה**: כל משתמש יכול ליצור אישור הגעה
- **עדכון**: משתמשים יכולים לעדכן את האישור שלהם, אדמינים יכולים לעדכן הכל
- **מחיקה**: רק אדמינים יכולים למחוק אישורי הגעה

## 🖼️ תצלומי מסך

![פאנל ניהול](https://via.placeholder.com/800x450/1a1a1a/38a169?text=Admin+Panel)
![טופס אישור הגעה](https://via.placeholder.com/800x450/1a1a1a/38a169?text=RSVP+Form)
![טבלת הסעות](https://via.placeholder.com/800x450/1a1a1a/38a169?text=Transportation+Table)

## 🤝 תרומה

מעוניינים לתרום? מצוין! כך ניתן לעשות זאת:

1. העתיקו את המאגר (fork)
2. צרו ענף חדש לתכונה/תיקון (`git checkout -b feature/amazing-feature`)
3. בצעו את השינויים שלכם
4. דחפו לענף (`git push origin feature/amazing-feature`)
5. פתחו בקשת משיכה (Pull Request)

## 📝 רישיון

פרויקט זה מופץ תחת רישיון MIT. ראו את קובץ `LICENSE` למידע נוסף.

## 📧 יצירת קשר

אתי נעמן - [@etaynam](https://github.com/etaynam) - etaynam@gmail.com 