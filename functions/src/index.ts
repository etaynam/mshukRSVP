/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import axios from 'axios';

// אתחול Firebase Admin SDK
admin.initializeApp();

/**
 * טיפוסים לפונקציות האימות
 */
interface SendOtpRequest {
  phoneNumber: string;
  rsvpId?: string;
  messagePrefix?: string; // הודעה מותאמת עבור SMS
}

interface VerifyOtpRequest {
  phoneNumber: string;
  code: string;
  rsvpId: string;
}

/**
 * ניסיון לשלוח קוד אימות באמצעות API של OTP של InfoRu
 */
const sendViaInfoRuOtpApi = async (phoneNumber: string, messagePrefix?: string): Promise<boolean> => {
  try {
    // ניקוי מספר הטלפון
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // קביעת תוכן הודעה דיפולטיבי אם לא סופק
    const otpPurpose = messagePrefix || "לאישור ההשתתפות שלך בנשף פורים";
    
    // בניית הבקשה לפי הפורמט הנכון שעובד
    const requestBody = {
      "User": {
        "Username": "MSHUKpurim",  // שימוש במחרוזת המדויקת
        "Token": "086ae857-091a-410e-a538-cabf582f3713"
      },
      "Data": {
        "OtpType": "sms",
        "OtpValue": cleanPhone,
        "MessageContent": `${otpPurpose}, קוד האימות שלך הוא: {code}` // שימוש בפרמטר {code} שיוחלף על ידי המערכת
      }
    };
    
    console.log('Sending OTP via InfoRu API with message prefix:', otpPurpose);
    
    // שליחת הבקשה
    const response = await axios.post(
      'https://capi.inforu.co.il/api/Otp/SendOtp', 
      requestBody,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('InfoRu OTP API response:', response.data);
    
    // בדיקה אם ההודעה נשלחה בהצלחה
    if (response.data && response.data.StatusId === 1) {
      console.log('InfoRu OTP sent successfully');
      return true;
    } else {
      console.error('InfoRu OTP API error:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error using InfoRu OTP API:', error);
    return false;
  }
};

/**
 * אימות OTP שנשלח באמצעות ה-API של InfoRu
 */
const verifyInfoRuOtp = async (phoneNumber: string, code: string): Promise<boolean> => {
  try {
    // ניקוי מספר הטלפון
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    console.log(`Attempting to verify OTP. Phone: ${cleanPhone}, Code: ${code}`);
    
    // בניית הבקשה לאימות ה-OTP בפורמט הנכון לפי הבדיקה ב-Postman
    const requestBody = {
      "User": {
        "Username": "MSHUKpurim",  // שימוש במחרוזת המדויקת
        "Token": "086ae857-091a-410e-a538-cabf582f3713"
      },
      "Data": {
        "OtpCode": code.toString(),
        "OtpValue": cleanPhone
      }
    };
    
    console.log('Verifying OTP via InfoRu API with request:', JSON.stringify(requestBody));
    
    // שליחת הבקשה לאימות
    const response = await axios.post(
      'https://capi.inforu.co.il/api/Otp/Authenticate', 
      requestBody,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('InfoRu OTP verification response:', response.data);
    
    // בדיקה אם האימות הצליח
    if (response.data && response.data.StatusId === 1) {
      console.log('InfoRu OTP verification successful');
      return true;
    } else {
      console.error('InfoRu OTP verification failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error verifying OTP via InfoRu API:', error);
    
    // הוספת מידע מפורט יותר על השגיאה
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', { 
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
    
    return false;
  }
};

/**
 * פונקציית Firebase לשליחת קוד OTP
 */
export const sendOtp = functions.region('europe-west1').https.onCall(async (data: SendOtpRequest) => {
  try {
    const { phoneNumber, rsvpId, messagePrefix } = data;
    
    // בדיקת תקינות הטלפון
    if (!phoneNumber || !/^\d{10,13}$/.test(phoneNumber.replace(/\D/g, ''))) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'מספר טלפון לא תקין'
      );
    }
    
    // ניקוי מספר הטלפון מכל תווים שאינם ספרות
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    // ניסיון לשלוח קוד דרך API של InfoRu
    // אין צורך ביצירת הקוד או שמירה במסד הנתונים - InfoRu מטפל בזה
    const smsSent = await sendViaInfoRuOtpApi(cleanedPhone, messagePrefix);
    
    if (!smsSent) {
      throw new functions.https.HttpsError(
        'unavailable',
        'שליחת ה-SMS נכשלה, אנא נסה שנית'
      );
    }
    
    // שמירת מזהה ה-RSVP לצורך עדכון מאוחר יותר
    const db = admin.firestore();
    const otpRef = db.collection('otpRequests').doc();
    await otpRef.set({
      phoneNumber: cleanedPhone,
      rsvpId: rsvpId || null,
      messagePrefix: messagePrefix || "לאישור ההשתתפות שלך בנשף פורים", // שמירת תוכן ההודעה המועדף
      requestedAt: admin.firestore.Timestamp.now()
    });
    
    return { success: true, requestId: otpRef.id };
  } catch (error) {
    console.error('Error in sendOtp:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'אירעה שגיאה בעת שליחת קוד האימות'
    );
  }
});

/**
 * פונקציית Firebase לאימות קוד OTP
 */
export const verifyOtp = functions.region('europe-west1').https.onCall(async (data: VerifyOtpRequest) => {
  try {
    console.log('verifyOtp function called with data:', JSON.stringify(data));
    
    const { phoneNumber, code, rsvpId } = data;
    
    // בדיקת תקינות הטלפון והקוד
    if (!phoneNumber || !code || !rsvpId) {
      console.error('Missing verification data:', { phoneNumber, code: code ? 'provided' : 'missing', rsvpId });
      throw new functions.https.HttpsError(
        'invalid-argument',
        'חסרים נתונים לאימות'
      );
    }
    
    // ניקוי מספר הטלפון מכל תווים שאינם ספרות
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    console.log(`Attempting to verify OTP for phone ${cleanedPhone} with code ${code}`);
    
    // כעת נשתמש ב-API של InfoRu כדי לאמת את הקוד ישירות
    const verifiedByInfoRu = await verifyInfoRuOtp(cleanedPhone, code);
    
    if (!verifiedByInfoRu) {
      // אם האימות נכשל ב-API, זרוק שגיאה
      console.error(`OTP verification failed for phone ${cleanedPhone}`);
      throw new functions.https.HttpsError(
        'invalid-argument',
        'קוד אימות שגוי'
      );
    }
    
    console.log(`OTP verification successful for phone ${cleanedPhone}, updating RSVP status.`);
    
    // עדכון סטטוס האימות ב-RSVP
    const db = admin.firestore();
    const rsvpRef = db.collection('rsvps').doc(rsvpId);
    await rsvpRef.update({
      phoneVerified: true,
      phoneVerifiedAt: admin.firestore.Timestamp.now()
    });
    
    console.log(`RSVP ${rsvpId} updated with verified status`);
    
    return { success: true };
  } catch (error) {
    console.error('Error in verifyOtp:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'אירעה שגיאה בעת אימות הקוד'
    );
  }
}); 