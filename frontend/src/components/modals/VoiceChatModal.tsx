'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  RefreshCw,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => Promise<void>;
  activeSessionId?: string;
  userVoice?: string;
  language?: string;
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  activeSessionId,
  userVoice = '',
  language = 'en-US',
}) => {
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const currentSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopListening();
      stopSpeaking();
    };
  }, []);

  // When modal opens, start listening
  useEffect(() => {
    if (isOpen) {
      setVoiceState('idle');
      setTranscript('');
      setAiResponse('');
      setErrorMessage(null);
      startListening();
    } else {
      stopListening();
      stopSpeaking();
    }
  }, [isOpen]);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  };

  const startListening = async () => {
    stopSpeaking();
    stopListening();
    setErrorMessage(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setVoiceState('idle');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language || 'en-US';

      let accumulated = '';

      recognition.onstart = () => {
        if (isMountedRef.current) {
          setVoiceState('listening');
        }
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = 0; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += t + ' ';
          } else {
            interim += t;
          }
        }

        const currentText = (final + interim).trim();
        accumulated = currentText;
        if (isMountedRef.current) {
          setTranscript(currentText);
        }

        // Reset silence timer on new speech
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // Auto-send when user finishes speaking (1.4s of silence)
        if (currentText.length > 2) {
          silenceTimerRef.current = setTimeout(() => {
            if (accumulated.trim()) {
              handleSendVoicePrompt(accumulated.trim());
            }
          }, 1400);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions.');
        }
        if (isMountedRef.current && voiceState === 'listening') {
          setVoiceState('idle');
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current && voiceState === 'listening') {
          // If ended naturally and we have text, send it
          if (accumulated.trim()) {
            handleSendVoicePrompt(accumulated.trim());
          } else {
            setVoiceState('idle');
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Mic start failed:', err);
      setErrorMessage('Could not access microphone. Please enable permissions.');
      setVoiceState('idle');
    }
  };

  const handleSendVoicePrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    stopListening();
    setVoiceState('thinking');
    setTranscript(promptText);
    setAiResponse('');

    try {
      let accumulatedAiText = '';

      await api.streamChat(
        {
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          session_id: activeSessionId,
          language_name: language,
        },
        (chunk: string) => {
          accumulatedAiText += chunk;
          if (isMountedRef.current) {
            setAiResponse(accumulatedAiText);
          }
        },
        () => {
          // Stream completed -> speak response aloud
          if (isMountedRef.current) {
            speakAiResponse(accumulatedAiText);
          }
        },
        (err: string) => {
          if (isMountedRef.current) {
            setErrorMessage(`AI connection notice: ${err}`);
            setVoiceState('idle');
          }
        }
      );
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || 'Failed to connect to AI voice model');
        setVoiceState('idle');
      }
    }
  };

  const speakAiResponse = (rawText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceState('idle');
      return;
    }

    setVoiceState('speaking');
    stopSpeaking();

    // Clean text for natural reading (remove markdown, code blocks, hashes)
    const clean = rawText
      .replace(/```[\s\S]*?```/g, 'Code block omitted in voice response.')
      .replace(/[`*#_~[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      setVoiceState('idle');
      startListening();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (userVoice) {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.name === userVoice);
      if (match) utterance.voice = match;
    }

    utterance.onend = () => {
      if (isMountedRef.current) {
        setVoiceState('idle');
        // Automatically resume listening for continuous hands-free dialogue
        setTimeout(() => {
          if (isMountedRef.current && isOpen) {
            startListening();
          }
        }, 400);
      }
    };

    utterance.onerror = () => {
      if (isMountedRef.current) {
        setVoiceState('idle');
        startListening();
      }
    };

    currentSpeechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 flex flex-col items-center shadow-2xl overflow-hidden">
        {/* Ambient Glow */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
            voiceState === 'listening'
              ? 'bg-emerald-500/20'
              : voiceState === 'thinking'
              ? 'bg-cyan-500/25 animate-pulse'
              : voiceState === 'speaking'
              ? 'bg-white/20'
              : 'bg-zinc-800/20'
          }`}
        />

        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between z-10 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-semibold">
              Phantom Live Voice Mode
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800/60 transition-colors cursor-pointer"
            title="Close Voice Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Central Animated Neural Orb */}
        <div className="my-8 relative flex items-center justify-center">
          {/* Pulsing Outer Rings */}
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-zinc-700/60 flex items-center justify-center transition-all duration-500 ${
              voiceState === 'listening'
                ? 'scale-110 border-emerald-400/50 shadow-[0_0_50px_rgba(52,211,153,0.3)]'
                : voiceState === 'thinking'
                ? 'scale-105 border-cyan-400/60 animate-spin shadow-[0_0_50px_rgba(34,211,238,0.3)]'
                : voiceState === 'speaking'
                ? 'scale-110 border-white/60 shadow-[0_0_50px_rgba(255,255,255,0.3)]'
                : 'border-zinc-800'
            }`}
          >
            {/* Inner Core */}
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                voiceState === 'listening'
                  ? 'bg-emerald-500 text-black shadow-lg'
                  : voiceState === 'thinking'
                  ? 'bg-cyan-500 text-black animate-pulse'
                  : voiceState === 'speaking'
                  ? 'bg-white text-black shadow-mono-glow'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
            >
              {voiceState === 'listening' ? (
                <Mic className="w-10 h-10 animate-bounce" />
              ) : voiceState === 'thinking' ? (
                <Sparkles className="w-10 h-10 animate-spin" />
              ) : voiceState === 'speaking' ? (
                <Volume2 className="w-10 h-10 animate-pulse" />
              ) : (
                <MicOff className="w-8 h-8" />
              )}
            </div>
          </div>
        </div>

        {/* Status Indicator Pill */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-colors ${
              voiceState === 'listening'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : voiceState === 'thinking'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : voiceState === 'speaking'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {voiceState === 'listening' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Listening... Speak naturally
              </>
            )}
            {voiceState === 'thinking' && (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Thinking & Synthesizing...
              </>
            )}
            {voiceState === 'speaking' && (
              <>
                <Volume2 className="w-3 h-3" />
                Speaking response...
              </>
            )}
            {voiceState === 'idle' && 'Tap Mic to Start Speaking'}
          </span>
        </div>

        {/* Live Transcripts Box */}
        <div className="w-full min-h-[90px] max-h-40 overflow-y-auto p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center font-sans">
          {errorMessage ? (
            <p className="text-xs text-red-400">{errorMessage}</p>
          ) : voiceState === 'speaking' && aiResponse ? (
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed italic">
              "{aiResponse.slice(0, 200)}{aiResponse.length > 200 ? '...' : ''}"
            </p>
          ) : transcript ? (
            <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">
              "{transcript}"
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Start talking or ask anything. Phantom AI will listen and speak back directly.
            </p>
          )}
        </div>

        {/* Action Controls Toolbar */}
        <div className="w-full flex items-center justify-center gap-3 mt-6 z-10">
          {voiceState === 'listening' ? (
            <button
              onClick={() => {
                if (transcript.trim()) {
                  handleSendVoicePrompt(transcript.trim());
                } else {
                  stopListening();
                  setVoiceState('idle');
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Now</span>
            </button>
          ) : voiceState === 'speaking' ? (
            <button
              onClick={() => {
                stopSpeaking();
                startListening();
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-2 border border-zinc-700 transition-all cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Interrupt & Speak</span>
            </button>
          ) : (
            <button
              onClick={startListening}
              className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-mono-glow"
            >
              <Mic className="w-3.5 h-3.5 fill-black" />
              <span>Start Speaking</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
