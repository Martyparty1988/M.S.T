

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import Modal from './Modal';

interface Message {
  role: 'user' | 'model';
  text: string;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const GeminiAssistant: React.FC = () => {
  const { t } = useI18n();
  const { projects, workers, workEntries } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const getSystemContext = () => {
    // Filter for last 14 days of logs to keep context relevant and small enough
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const recentEntries = workEntries
      .filter(e => new Date(e.date) >= twoWeeksAgo)
      .map(e => ({
        ...e,
        // Simplified structure for token efficiency
        date: e.date.split('T')[0],
        workers: e.workerIds.map(id => workers.find(w => w.id === id)?.name || id).join(', ')
      }));

    return JSON.stringify({
      availableProjects: projects.map(p => ({ name: p.name, status: p.status, totalTables: p.tables?.length || 0 })),
      workers: workers.map(w => ({ name: w.name, hourlyRate: w.rate })),
      recentWorkLogs: recentEntries
    });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    if (!navigator.onLine) {
       setMessages(prev => [...prev, { role: 'user', text: inputText }, { role: 'model', text: t('toast_ai_error') }]);
       setInputText('');
       return;
    }

    const userMessage = inputText;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInputText('');
    setIsThinking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = getSystemContext();
      
      const systemInstruction = `You are a helpful solar construction project assistant. 
      You have access to the raw data of workers, projects, and work logs in JSON format.
      Current Data Context: ${context}
      
      Answer questions concisely based on this data.
      If asked about progress, calculate totals from the logs.
      If asked about specific workers, aggregate their logs.
      Always reply in the user's language or the context language.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMessage,
        config: {
            systemInstruction: systemInstruction,
        }
      });

      const text = response.text || "I couldn't generate a response.";
      setMessages(prev => [...prev, { role: 'model', text }]);

    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: t('toast_ai_error') }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSpeak = async (text: string) => {
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash-preview-tts",
              contents: [{ parts: [{ text }] }],
              config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                      voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Kore' },
                      },
                  },
              },
          });

          const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
          const outputNode = outputAudioContext.createGain();
          outputNode.connect(outputAudioContext.destination);

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          
          if (base64Audio) {
              const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  outputAudioContext,
                  24000,
                  1,
              );
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.start();
          }
      } catch (error) {
          console.error("TTS Error", error);
      }
  }

  const handleSuggestionClick = (text: string) => {
      setInputText(text);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg flex items-center justify-center transform hover:scale-110 active:scale-95 transition-transform"
        style={{ paddingBottom: `var(--safe-area-inset-bottom)` }}
        aria-label="AI Assistant"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('ai_assistant_title')} closeOnOverlayClick={true} maxWidthClass="max-w-md">
        <div className="flex flex-col h-[60vh]">
          <div className="flex-grow overflow-y-auto space-y-4 p-2">
            {messages.length === 0 && (
                <div className="space-y-2">
                    <p className="text-white/60 text-sm mb-4">{t('ai_chat_placeholder')}</p>
                    <p className="text-xs text-[var(--accent-color)] font-bold uppercase">{t('ai_suggested_questions')}</p>
                    <button onClick={() => handleSuggestionClick(t('ai_suggestion_1'))} className="block w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white transition">{t('ai_suggestion_1')}</button>
                    <button onClick={() => handleSuggestionClick(t('ai_suggestion_2'))} className="block w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white transition">{t('ai_suggestion_2')}</button>
                    <button onClick={() => handleSuggestionClick(t('ai_suggestion_3'))} className="block w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white transition">{t('ai_suggestion_3')}</button>
                </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {msg.role === 'model' && (
                    <button 
                        onClick={() => handleSpeak(msg.text)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-[var(--accent-color)] transition active:scale-95 mb-1"
                        title={t('ai_speak')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    </button>
                )}
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-[var(--accent-color)] text-white' : 'bg-white/10 text-white/90'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isThinking && (
                 <div className="flex justify-start">
                    <div className="bg-white/10 p-3 rounded-2xl">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="mt-4 pt-2 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={t('ai_chat_placeholder')}
              className="flex-grow bg-white/5 text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
            />
            <button
              onClick={handleSendMessage}
              disabled={isThinking || !inputText.trim()}
              className="bg-[var(--accent-color)] text-white p-3 rounded-xl font-bold disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default GeminiAssistant;
