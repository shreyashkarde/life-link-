import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';

const router = Router();

// In-memory conversation session store with timestamp tracking
interface ChatSessionRecord {
  history: Content[];
  lastActive: number;
}

const sessionStore = new Map<string, ChatSessionRecord>();

// Periodic session cleanup (older than 2 hours)
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      sessionStore.delete(id);
    }
  }
}, 30 * 60 * 1000);

const buildSystemInstruction = (language: string = 'English') => `
You are "Nani", a warm, empathetic, and knowledgeable AI assistant for Life Link, an emergency medical response and hospital dispatch application.

Your Personality:
- Friendly, caring, courteous, and polite (like a comforting, knowledgeable healthcare coordinator).
- Clear, concise, and focused.

Strict Behavioral and Safety Rules:
1. Exact & Direct Answers: Answer ONLY what the user explicitly asks. Do NOT offer unsolicited tips, unrequested feature tours, or lengthy tangents.
2. Language Requirement: You MUST reply entirely in the requested language: "${language}". Match natural, fluent conversational phrasing for that language.
3. LifeLink App Knowledge:
   - LifeLink connects patients with rapid emergency ambulance dispatch (BLS - Basic Life Support, ALS - Advanced Life Support, Oxygen Support).
   - The platform includes: SOS emergency button with a 10-second cancellable safety window, real-time ambulance GPS tracking, hospital bed capacity and department admissions (General Ward, ICU, Emergency), ER bay allocation telemetry, and patient medical profile management.
4. Critical Medical Guardrails:
   - You are NOT a doctor and must NEVER provide medical diagnosis, prescribe medications, or replace professional clinicians.
   - For ANY query describing acute, severe, or life-threatening symptoms (such as chest pressure/pain, shortness of breath, severe bleeding, signs of stroke, unconsciousness, severe allergic reactions, or acute trauma):
     IMMEDIATELY and URGENTLY direct the patient to press the LifeLink SOS button or call emergency services (e.g. 911 / 112 / 108). Do not delay with diagnostic chit-chat.
   - For general non-urgent wellness or health inquiries, provide brief, accurate, non-diagnostic information accompanied by a light recommendation to consult a doctor.
`;

/**
 * POST /api/chatbot/message
 * Body: { message: string, language?: string, sessionId?: string }
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, language = 'English', sessionId = `session_${Date.now()}` } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const trimmedMessage = message.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    // Retrieve or initialize conversation session history
    let session = sessionStore.get(sessionId);
    if (!session) {
      session = { history: [], lastActive: Date.now() };
      sessionStore.set(sessionId, session);
    } else {
      session.lastActive = Date.now();
    }

    // Fallback if GEMINI_API_KEY is not configured in backend/.env
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in backend/.env. Using contextual domain fallback reply.');
      const lower = trimmedMessage.toLowerCase();
      let mockReply = '';

      if (lower.includes('sos') || lower.includes('emergency') || lower.includes('chest') || lower.includes('breath') || lower.includes('bleeding') || lower.includes('heart attack')) {
        mockReply = language.toLowerCase().includes('hindi')
          ? 'यह आपातकालीन स्थिति लग रही है। कृपया तुरंत ऐप में लाल SOS बटन दबाएं या आपातकालीन सेवा (112 / 108) को कॉल करें!'
          : 'This sounds urgent. Please click the SOS button right now or call your local emergency number (112 / 911 / 108) immediately!';
      } else if (lower.includes('how') && lower.includes('sos')) {
        mockReply = 'The SOS button initiates an emergency alert with a 10-second safety cancellation window. If not cancelled within 10 seconds, it automatically dispatches the nearest ambulance to your GPS location.';
      } else if (lower.includes('ambulance') || lower.includes('vehicle')) {
        mockReply = 'LifeLink supports three types of ambulances: Basic Life Support (BLS), Advanced Life Support (ALS) with paramedic monitoring, and Oxygen Support for respiratory distress.';
      } else if (lower.includes('bed') || lower.includes('hospital') || lower.includes('admission')) {
        mockReply = 'You can check real-time hospital bed availability and submit admission requests under the "Beds & Admissions" tab in your Patient Dashboard.';
      } else if (lower.includes('profile') || lower.includes('blood') || lower.includes('allerg')) {
        mockReply = 'You can update your blood group, known allergies, emergency contacts, and medical history in the "Medical Profile" tab of your dashboard.';
      } else if (lower.includes('who are you') || lower.includes('nani') || lower.includes('hello') || lower.includes('hi')) {
        mockReply = language.toLowerCase().includes('hindi')
          ? 'नमस्ते! मैं नानी हूँ, आपकी लाइफलिंक स्वास्थ्य सहायक। मैं एम्बुलेंस, अस्पताल के बेड और ऐप सुविधाओं में आपकी मदद कर सकती हूँ।'
          : 'Hello! I am Nani, your caring LifeLink healthcare assistant. I can help you navigate emergency dispatch, find hospital beds, and explain platform features.';
      } else {
        mockReply = language.toLowerCase().includes('hindi')
          ? 'मैं नानी हूँ। आप मुझसे लाइफलिंक आपातकालीन सेवाओं, अस्पताल के बेड और एम्बुलेंस के बारे में पूछ सकते हैं। (पूरी तरह से सक्रिय करने के लिए backend/.env में GEMINI_API_KEY दर्ज करें)'
          : `I am Nani. I can guide you on LifeLink emergency dispatch, hospital bed availability, and patient profiles. (To enable unrestricted Gemini AI conversational answers, please set your GEMINI_API_KEY in backend/.env)`;
      }

      return res.json({
        reply: mockReply,
        sessionId,
        language,
      });
    }

    // Initialize Google Gemini Client
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: buildSystemInstruction(language),
    });

    // Start chat with rolling history
    const chat = model.startChat({
      history: session.history,
    });

    const result = await chat.sendMessage(trimmedMessage);
    const replyText = result.response.text();

    // Update session history (keep last 10 messages = 5 exchanges)
    session.history.push({
      role: 'user',
      parts: [{ text: trimmedMessage }],
    });
    session.history.push({
      role: 'model',
      parts: [{ text: replyText }],
    });

    if (session.history.length > 10) {
      session.history = session.history.slice(-10);
    }

    return res.json({
      reply: replyText,
      sessionId,
      language,
    });
  } catch (error: any) {
    console.error('Error in Gemini Chatbot API:', error);

    // Provide friendly fallback if rate limit or model issue occurs
    const userFallback =
      'I apologize, but I am having a brief moment of connection difficulty. If you have an urgent medical need, please tap the SOS button immediately!';

    return res.status(200).json({
      reply: userFallback,
      sessionId: req.body?.sessionId || 'default',
      error: error.message || 'Gemini processing error',
    });
  }
});

export default router;
