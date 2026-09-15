import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;
if (accountSid && authToken && accountSid.startsWith('AC')) {
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (err) {
    console.warn('[SMS] Twilio client initialization failed, falling back to mock logger:', err);
  }
}

export interface SendSmsResult {
  recipient: string;
  success: boolean;
  messageId?: string;
  error?: string;
  mock?: boolean;
}

export async function sendSMS(to: string, message: string): Promise<SendSmsResult> {
  const cleanPhone = to.trim();
  if (!cleanPhone) {
    return { recipient: to, success: false, error: 'Empty phone number' };
  }

  if (twilioClient && twilioNumber) {
    try {
      const res = await twilioClient.messages.create({
        body: message,
        from: twilioNumber,
        to: cleanPhone,
      });
      console.log(`[SMS TWILIO] Sent message to ${cleanPhone}: SID=${res.sid}`);
      return { recipient: cleanPhone, success: true, messageId: res.sid, mock: false };
    } catch (err: any) {
      console.error(`[SMS TWILIO ERROR] Failed sending to ${cleanPhone}:`, err.message);
      return { recipient: cleanPhone, success: false, error: err.message, mock: false };
    }
  }

  // Graceful fallback mock logger if Twilio credentials are not configured
  console.log(`\n================== [SMS DISPATCH (MOCK)] ==================`);
  console.log(`To:      ${cleanPhone}`);
  console.log(`Message: ${message}`);
  console.log(`Time:    ${new Date().toISOString()}`);
  console.log(`Note:    Provide TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in backend/.env for live cellular delivery.`);
  console.log(`===========================================================\n`);
  return { recipient: cleanPhone, success: true, messageId: `mock_${Date.now()}`, mock: true };
}

export async function sendEmergencyAlertToContacts(
  contacts: { name: string; phone: string }[],
  patientName: string,
  customMessage?: string | null,
  location?: { lat: number; lng: number }
): Promise<SendSmsResult[]> {
  const defaultBody = `${patientName} has triggered an SOS Emergency Alert via LifeLink!`;
  const custom = customMessage ? ` Message: "${customMessage}".` : '';
  const loc = location ? ` Location: https://maps.google.com/?q=${location.lat},${location.lng}` : '';
  const fullText = `EMERGENCY ALERT: ${defaultBody}${custom}${loc} Please check on them immediately.`;

  const results: SendSmsResult[] = [];
  for (const c of contacts) {
    if (c.phone) {
      const res = await sendSMS(c.phone, fullText);
      results.push(res);
    }
  }
  return results;
}
