import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MessageCircle,
  X,
  Send,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  Bot,
  AlertTriangle,
  RotateCcw,
  Languages
} from 'lucide-react';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  bcp47: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en-US', name: 'English', nativeName: 'English', bcp47: 'en-US' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', bcp47: 'mr-IN' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', bcp47: 'bn-IN' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', bcp47: 'es-ES' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', bcp47: 'fr-FR' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', bcp47: 'de-DE' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', bcp47: 'ar-SA' },
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'nani';
  text: string;
  timestamp: Date;
}

export const NaniChat: React.FC = () => {
  const { apiFetch } = useAuth();

  // Widget state
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Selected language state (persisted)
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('nani_language');
    if (saved) {
      const found = SUPPORTED_LANGUAGES.find((l) => l.code === saved);
      if (found) return found;
    }
    return SUPPORTED_LANGUAGES[0];
  });

  // Audio mute preference (persisted, default: false)
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('nani_muted') === 'true';
  });

  // Session ID
  const [sessionId] = useState<string>(() => {
    const existing = sessionStorage.getItem('nani_session_id');
    if (existing) return existing;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('nani_session_id', newId);
    return newId;
  });

  // Conversation messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'nani',
      text: 'Namaste! I am Nani, your LifeLink healthcare assistant. How can I help you with emergency services, hospital beds, or navigating the platform today?',
      timestamp: new Date(),
    },
  ]);

  // SpeechSynthesis voices cache
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Load and cache SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Persist language selection
  useEffect(() => {
    localStorage.setItem('nani_language', selectedLang.code);
  }, [selectedLang]);

  // Persist mute state
  useEffect(() => {
    localStorage.setItem('nani_muted', String(isMuted));
    if (isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isMuted]);

  // Stop speech when closing widget
  const handleClose = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.abort();
    }
    setIsSpeaking(false);
    setIsListening(false);
    setIsOpen(false);
  };

  // Speak text using Web Speech API (Feature 5)
  const speakReply = (text: string) => {
    if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Cancel any prior speech

      // Strip markdown asterisks or code formatting for cleaner speech flow
      const sanitized = text
        .replace(/[*_#`~]/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (!sanitized) return;

      const utterance = new SpeechSynthesisUtterance(sanitized);
      utterance.lang = selectedLang.bcp47;
      utterance.rate = 1.0;
      utterance.pitch = 1.05; // Slightly warmer tone

      // Find closest matching voice
      const targetLang = selectedLang.bcp47.toLowerCase();
      const langPrefix = selectedLang.bcp47.split('-')[0].toLowerCase();

      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === targetLang) ||
        voices.find((v) => v.lang.toLowerCase().replace('_', '-') === targetLang) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech output not supported or blocked:', err);
      setIsSpeaking(false);
    }
  };

  // Send message to Groq backend (Feature 4)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    // Stop current speech or voice recognition
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    if (speechRecognitionRef.current && isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }

    const userText = inputMessage.trim();
    setInputMessage('');

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await apiFetch('/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({
          message: userText,
          language: selectedLang.name,
          sessionId,
        }),
      });

      const replyText = (data && data.reply) || "I'm here to help. Could you please rephrase that?";
      const naniMsg: ChatMessage = {
        id: `reply_${Date.now()}`,
        sender: 'nani',
        text: replyText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, naniMsg]);

      // Voice output via Web Speech API
      speakReply(replyText);
    } catch (err: any) {
      console.error('Nani Chatbot Error:', err);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'nani',
        text: 'I am experiencing a slight delay in connecting to my network. For acute emergencies, please use the SOS button immediately.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Voice Input (Web Speech API SpeechRecognition - optional nice-to-have)
  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = selectedLang.bcp47;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleResetChat = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'nani',
        text: `Namaste! I'm Nani. I'm ready to assist you in ${selectedLang.name}. Ask me anything about LifeLink, emergency dispatch, or hospital beds.`,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="mb-3 w-[92vw] sm:w-[380px] h-[520px] max-h-[82vh] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 p-4 text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-lg shadow-inner">
                  👵
                </div>
                {/* Speaking Wave Indicator */}
                {isSpeaking ? (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 border border-white flex items-center justify-center text-[8px]">
                      🔊
                    </span>
                  </span>
                ) : (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm tracking-tight">Nani</h3>
                  <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-[9px] font-mono font-bold uppercase tracking-wider">
                    AI Guide
                  </span>
                </div>
                <p className="text-[10px] text-rose-100 font-medium">
                  {isSpeaking ? 'Speaking reply...' : 'LifeLink Patient Assistant'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              {/* Language Selection Dropdown */}
              <div className="relative flex items-center bg-black/20 hover:bg-black/30 rounded-xl px-2 py-1 text-xs border border-white/20 transition-colors">
                <Languages className="w-3.5 h-3.5 mr-1 opacity-90" />
                <select
                  value={selectedLang.code}
                  onChange={(e) => {
                    const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                    if (found) setSelectedLang(found);
                  }}
                  className="bg-transparent text-white font-semibold text-[11px] focus:outline-none cursor-pointer pr-1"
                  title="Select Conversation Language"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="text-gray-900 bg-white">
                      {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mute / Unmute Audio Toggle */}
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-black/30 text-rose-200 hover:bg-black/40'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                title={isMuted ? 'Unmute voice replies' : 'Mute voice replies'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Reset chat */}
              <button
                type="button"
                onClick={handleResetChat}
                className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Close / Collapse button */}
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
                title="Close Nani"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300 shrink-0 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              For acute emergencies, immediately press the <strong className="font-extrabold text-rose-600 dark:text-rose-400">SOS</strong> button.
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-100 dark:bg-slate-950 text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 flex items-center justify-center shrink-0 text-sm shadow-sm">
                      👵
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed whitespace-pre-wrap break-words ${
                      isUser
                        ? 'bg-rose-600 text-white rounded-tr-none shadow-rose-600/20'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <p className={`text-xs leading-relaxed ${isUser ? 'text-white font-medium' : 'text-slate-900 dark:text-slate-100 font-medium'}`}>
                      {msg.text}
                    </p>
                    <div
                      className={`text-[9px] font-mono mt-1.5 ${
                        isUser ? 'text-rose-200 text-right' : 'text-slate-500 dark:text-slate-400 text-left'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing / Thinking Indicator */}
            {loading && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 flex items-center justify-center shrink-0 text-sm shadow-sm">
                  👵
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" />
                  <span className="text-xs text-slate-700 dark:text-slate-200 ml-1.5 font-semibold">Nani is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input & Send Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
          >
            {/* Optional Speech-to-Text Mic Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={isListening ? 'Listening... click to stop' : `Voice input in ${selectedLang.name}`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Ask Nani in ${selectedLang.nativeName}...`}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors font-medium"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Collapsed State: Floating Button (Feature 1) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 p-3.5 bg-gradient-to-tr from-rose-700 via-rose-600 to-pink-500 text-white rounded-full shadow-2xl hover:shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border-2 border-white/20"
          aria-label="Open Nani AI Assistant"
        >
          {/* Subtle Ambient Pulse Ring */}
          <span className="absolute -inset-1 rounded-full bg-rose-500/30 animate-ping pointer-events-none opacity-60" />

          {/* Avatar Icon */}
          <span className="text-2xl leading-none">👵</span>

          {/* Friendly Label on Hover or Mobile */}
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-bold tracking-wide pr-1">
            Talk to Nani
          </span>

          {/* Speaking Audio Badge if active in background */}
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
          )}
        </button>
      )}
    </div>
  );
};

export default NaniChat;
