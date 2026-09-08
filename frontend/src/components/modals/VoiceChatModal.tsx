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
  Radio,
} from 'lucide-react';
import { api } from '@/lib/api';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (text: string) => Promise<void>;
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
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isAutoLoop, setIsAutoLoop] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    stopSpeaking();
    stopListening();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setVoiceState('idle');
      setTranscript('');
      setAiResponse('');
      setErrorMessage(null);
    } else {
      cleanupAudio();
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
      silenceTimerRef.current = null;
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
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
  };

  // Real-time microphone audio visualizer
  const setupAudioAnalyser = async (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!isMountedRef.current || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength / 255;
        setAudioLevel(avg);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn('AudioContext setup note:', e);
    }
  };

  const startListening = async () => {
    stopSpeaking();
    stopListening();
    setErrorMessage(null);
    setTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setVoiceState('idle');
      return;
    }

    try {
      let stream: MediaStream | null = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setupAudioAnalyser(stream);
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

        // Reset silence timer on every new speech token
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // Auto-send when user finishes speaking (1.2s silence pause)
        if (currentText.length > 2) {
          silenceTimerRef.current = setTimeout(() => {
            if (accumulated.trim() && isMountedRef.current) {
              handleSendVoicePrompt(accumulated.trim());
            }
          }, 1200);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions.');
        } else if (event.error === 'no-speech') {
          // No speech detected -> stay in listening mode
          return;
        }
        if (isMountedRef.current && voiceState === 'listening') {
          setVoiceState('idle');
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current && voiceState === 'listening') {
          if (accumulated.trim()) {
            handleSendVoicePrompt(accumulated.trim());
          } else {
            setVoiceState('idle');
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.warn('Mic start failed:', err);
      setErrorMessage('Could not access microphone. Please enable audio permissions in your browser.');
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
          // Stream completed -> immediately speak the response aloud
          if (isMountedRef.current) {
            speakAiResponse(accumulatedAiText);
          }
        },
        (err: string) => {
          if (isMountedRef.current) {
            setErrorMessage(`AI response error: ${err}`);
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

    // Chrome speech synthesis unstuck fix
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Clean text for natural speech
    const clean = rawText
      .replace(/```[\s\S]*?```/g, 'Code snippet generated.')
      .replace(/[`*#_~[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      setVoiceState('idle');
      if (isAutoLoop) startListening();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = language || 'en-US';

    if (userVoice) {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.name === userVoice);
      if (match) utterance.voice = match;
    }

    utterance.onend = () => {
      if (isMountedRef.current) {
        setVoiceState('idle');
        // When AI finishes speaking, automatically start listening again for true continuous conversation
        if (isAutoLoop && isOpen) {
          setTimeout(() => {
            if (isMountedRef.current && isOpen) {
              startListening();
            }
          }, 350);
        }
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis playback note:', e);
      if (isMountedRef.current) {
        setVoiceState('idle');
        if (isAutoLoop && isOpen) startListening();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 flex flex-col items-center shadow-2xl overflow-hidden">
        {/* Ambient Radial Glow */}
        <div
          className={`absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
            voiceState === 'listening'
              ? 'bg-emerald-500/25'
              : voiceState === 'thinking'
              ? 'bg-cyan-500/30 animate-pulse'
              : voiceState === 'speaking'
              ? 'bg-white/20'
              : 'bg-zinc-800/10'
          }`}
        />

        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between z-10 mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                voiceState === 'listening'
                  ? 'bg-emerald-400 animate-ping'
                  : voiceState === 'speaking'
                  ? 'bg-white animate-pulse'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-semibold">
              Live Voice Conversation
            </span>
          </div>

          <button
            onClick={() => {
              cleanupAudio();
              onClose();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800/60 transition-colors cursor-pointer"
            title="Close Voice Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Central Animated Neural Orb */}
        <div
          className="my-6 relative flex items-center justify-center cursor-pointer select-none"
          onClick={() => {
            if (voiceState === 'idle') startListening();
            else if (voiceState === 'speaking') {
              stopSpeaking();
              startListening();
            } else if (voiceState === 'listening') {
              if (transcript.trim()) handleSendVoicePrompt(transcript.trim());
              else stopListening();
            }
          }}
        >
          {/* Pulsing Dynamic Outer Rings based on real mic volume */}
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border flex items-center justify-center transition-all duration-300 ${
              voiceState === 'listening'
                ? 'border-emerald-400/60 shadow-[0_0_50px_rgba(52,211,153,0.35)]'
                : voiceState === 'thinking'
                ? 'border-cyan-400/70 animate-spin shadow-[0_0_50px_rgba(34,211,238,0.3)]'
                : voiceState === 'speaking'
                ? 'border-white/70 animate-pulse shadow-[0_0_50px_rgba(255,255,255,0.35)]'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
            style={{
              transform:
                voiceState === 'listening'
                  ? `scale(${1 + Math.min(audioLevel * 0.8, 0.4)})`
                  : 'scale(1)',
            }}
          >
            {/* Inner Core */}
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                voiceState === 'listening'
                  ? 'bg-emerald-500 text-black'
                  : voiceState === 'thinking'
                  ? 'bg-cyan-500 text-black'
                  : voiceState === 'speaking'
                  ? 'bg-white text-black shadow-mono-glow'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              {voiceState === 'listening' ? (
                <Mic className="w-10 h-10 animate-bounce" />
              ) : voiceState === 'thinking' ? (
                <Sparkles className="w-10 h-10 animate-spin" />
              ) : voiceState === 'speaking' ? (
                <Volume2 className="w-10 h-10 animate-pulse" />
              ) : (
                <Mic className="w-8 h-8" />
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
                Listening... (stops speaking to send)
              </>
            )}
            {voiceState === 'thinking' && (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Thinking...
              </>
            )}
            {voiceState === 'speaking' && (
              <>
                <Volume2 className="w-3 h-3" />
                Speaking to you...
              </>
            )}
            {voiceState === 'idle' && 'Tap the Orb to Start Talking'}
          </span>
        </div>

        {/* Live Conversation Display Box */}
        <div className="w-full min-h-[90px] max-h-40 overflow-y-auto p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center font-sans">
          {errorMessage ? (
            <p className="text-xs text-red-400">{errorMessage}</p>
          ) : voiceState === 'speaking' && aiResponse ? (
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed italic">
              "{aiResponse.slice(0, 220)}{aiResponse.length > 220 ? '...' : ''}"
            </p>
          ) : transcript ? (
            <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">
              "{transcript}"
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Speak naturally. When you pause, Phantom AI will answer and speak directly with you.
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
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Query</span>
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
              className="px-7 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-mono-glow hover:scale-105 active:scale-95"
            >
              <Mic className="w-4 h-4 fill-black" />
              <span>Start Speaking</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
