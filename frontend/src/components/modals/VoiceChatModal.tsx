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
} from 'lucide-react';
import { api } from '@/lib/api';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVoiceExchange?: (
    userText: string,
    aiText: string,
    sessionId?: string,
    sessionTitle?: string
  ) => void;
  onSendMessage?: (text: string) => Promise<void>;
  activeSessionId?: string;
  userVoice?: string;
  language?: string;
  onSessionUpdated?: (sessionId: string, sessionTitle?: string) => void;
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  onSaveVoiceExchange,
  onSendMessage,
  activeSessionId,
  userVoice = '',
  language = 'en-US',
  onSessionUpdated,
}) => {
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const voiceStateRef = useRef<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const accumulatedRef = useRef<string>('');
  const isOpenRef = useRef<boolean>(isOpen);
  const synthResumeTimerRef = useRef<any>(null);

  // Fast sentence-streaming speech queue
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingQueueRef = useRef<boolean>(false);
  const streamCompletedRef = useRef<boolean>(false);
  const pendingBufferRef = useRef<string>('');
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

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
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (synthResumeTimerRef.current) {
      clearInterval(synthResumeTimerRef.current);
      synthResumeTimerRef.current = null;
    }
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
      voiceStateRef.current = 'idle';
      setTranscript('');
      accumulatedRef.current = '';
      setAiResponse('');
      setErrorMessage(null);

      const startTimer = setTimeout(() => {
        if (isMountedRef.current && isOpenRef.current) {
          startListening();
        }
      }, 200);

      return () => clearTimeout(startTimer);
    } else {
      cleanupAudio();
    }
  }, [isOpen]);

  const stopSpeaking = () => {
    speechQueueRef.current = [];
    isSpeakingQueueRef.current = false;
    streamCompletedRef.current = false;
    pendingBufferRef.current = '';

    if (synthResumeTimerRef.current) {
      clearInterval(synthResumeTimerRef.current);
      synthResumeTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
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
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);
  };

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
    accumulatedRef.current = '';

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setVoiceState('idle');
      voiceStateRef.current = 'idle';
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

      const triggerSend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        const textToSend = accumulatedRef.current.trim();
        if (textToSend && isMountedRef.current && isOpenRef.current) {
          accumulatedRef.current = '';
          handleSendVoicePrompt(textToSend);
        }
      };

      recognition.onstart = () => {
        if (isMountedRef.current) {
          setVoiceState('listening');
          voiceStateRef.current = 'listening';
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
        accumulatedRef.current = currentText;

        if (isMountedRef.current) {
          setTranscript(currentText);
        }

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // Send automatically on pause (1.0s silence)
        if (currentText.length > 0) {
          silenceTimerRef.current = setTimeout(() => {
            triggerSend();
          }, 1000);
        }
      };

      recognition.onspeechend = () => {
        if (accumulatedRef.current.trim()) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            triggerSend();
          }, 600);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice recognition status:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access denied. Please allow audio permissions.');
        } else if (event.error === 'no-speech') {
          return;
        }
        if (isMountedRef.current && voiceStateRef.current === 'listening') {
          if (!accumulatedRef.current.trim()) {
            setVoiceState('idle');
            voiceStateRef.current = 'idle';
          }
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current && voiceStateRef.current === 'listening') {
          if (accumulatedRef.current.trim()) {
            triggerSend();
          } else if (isOpenRef.current) {
            try {
              recognition.start();
            } catch {
              setVoiceState('idle');
              voiceStateRef.current = 'idle';
            }
          } else {
            setVoiceState('idle');
            voiceStateRef.current = 'idle';
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.warn('Mic start failed:', err);
      setErrorMessage('Could not access microphone.');
      setVoiceState('idle');
      voiceStateRef.current = 'idle';
    }
  };

  const processSpeechQueue = () => {
    if (!isMountedRef.current || !isOpenRef.current) return;
    if (isSpeakingQueueRef.current) return;

    if (speechQueueRef.current.length === 0) {
      if (streamCompletedRef.current) {
        if (isMountedRef.current && isOpenRef.current) {
          setVoiceState('idle');
          voiceStateRef.current = 'idle';
          setTimeout(() => {
            if (isMountedRef.current && isOpenRef.current && voiceStateRef.current === 'idle') {
              startListening();
            }
          }, 300);
        }
      }
      return;
    }

    const nextSentence = speechQueueRef.current.shift();
    if (!nextSentence) {
      processSpeechQueue();
      return;
    }

    const clean = nextSentence
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*#_~[\]()<>]/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      processSpeechQueue();
      return;
    }

    isSpeakingQueueRef.current = true;
    setVoiceState('speaking');
    voiceStateRef.current = 'speaking';

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      isSpeakingQueueRef.current = false;
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      activeUtteranceRef.current = utterance;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = language || 'en-US';

      const voices = window.speechSynthesis.getVoices();
      if (userVoice && voices.length > 0) {
        const match = voices.find((v) => v.name === userVoice);
        if (match) utterance.voice = match;
      } else if (voices.length > 0) {
        const preferred =
          voices.find(
            (v) =>
              (v.lang.startsWith('en') || v.lang === language) &&
              (v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Neural') ||
                v.name.includes('Online'))
          ) || voices.find((v) => v.lang.startsWith('en') || v.lang === language);
        if (preferred) utterance.voice = preferred;
      }

      utterance.onend = () => {
        activeUtteranceRef.current = null;
        isSpeakingQueueRef.current = false;
        processSpeechQueue();
      };

      utterance.onerror = (e) => {
        console.warn('Speech chunk note:', e);
        activeUtteranceRef.current = null;
        isSpeakingQueueRef.current = false;
        processSpeechQueue();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      activeUtteranceRef.current = null;
      isSpeakingQueueRef.current = false;
      processSpeechQueue();
    }
  };

  const handleSendVoicePrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    stopSpeaking();
    stopListening();
    setVoiceState('thinking');
    voiceStateRef.current = 'thinking';
    setTranscript(promptText);
    setAiResponse('');

    speechQueueRef.current = [];
    isSpeakingQueueRef.current = false;
    streamCompletedRef.current = false;
    pendingBufferRef.current = '';

    try {
      let accumulatedAiText = '';

      await api.streamChat(
        {
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          session_id: activeSessionId,
          language_name: language,
          is_voice_mode: true,
        },
        (chunk: string, sId?: string, sTitle?: string) => {
          if (!isMountedRef.current || !isOpenRef.current) return;
          if (sId) onSessionUpdated?.(sId, sTitle);
          accumulatedAiText += chunk;
          setAiResponse(accumulatedAiText);

          // Real-time sentence parser for instant streaming speech
          pendingBufferRef.current += chunk;
          const sentenceRegex = /^([\s\S]*?[.?!:\n]+)(\s+[\s\S]*|$)/;
          let match = pendingBufferRef.current.match(sentenceRegex);
          while (match) {
            const sentence = match[1].trim();
            pendingBufferRef.current = match[2] ? match[2].trimStart() : '';
            if (sentence) {
              speechQueueRef.current.push(sentence);
              if (!isSpeakingQueueRef.current) {
                processSpeechQueue();
              }
            }
            match = pendingBufferRef.current.match(sentenceRegex);
          }
        },
        (sId?: string, sTitle?: string) => {
          if (!isMountedRef.current || !isOpenRef.current) return;
          streamCompletedRef.current = true;
          const leftover = pendingBufferRef.current.trim();
          pendingBufferRef.current = '';
          if (leftover) {
            speechQueueRef.current.push(leftover);
          }
          if (!isSpeakingQueueRef.current) {
            processSpeechQueue();
          }

          // Persist the voice conversation into the active chat session
          if (accumulatedAiText.trim()) {
            onSaveVoiceExchange?.(promptText, accumulatedAiText.trim(), sId, sTitle);
          }
        },
        (err: string) => {
          if (isMountedRef.current) {
            setErrorMessage(`Error: ${err}`);
            setVoiceState('idle');
            voiceStateRef.current = 'idle';
          }
        }
      );
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || 'Connection error');
        setVoiceState('idle');
        voiceStateRef.current = 'idle';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-xs sm:max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 flex flex-col items-center shadow-2xl">
        {/* Minimal Close Button */}
        <button
          onClick={() => {
            cleanupAudio();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Minimal Center Pulsing Orb */}
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
          {/* Subtle Outer Ring */}
          <div
            className={`w-32 h-32 rounded-full border flex items-center justify-center transition-all duration-300 ${
              voiceState === 'listening'
                ? 'border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                : voiceState === 'thinking'
                ? 'border-zinc-500 animate-spin'
                : voiceState === 'speaking'
                ? 'border-white/60 animate-pulse shadow-[0_0_30px_rgba(255,255,255,0.2)]'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
            style={{
              transform:
                voiceState === 'listening'
                  ? `scale(${1 + Math.min(audioLevel * 0.6, 0.25)})`
                  : 'scale(1)',
            }}
          >
            {/* Core Circle */}
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                voiceState === 'listening'
                  ? 'bg-white text-black'
                  : voiceState === 'thinking'
                  ? 'bg-zinc-800 text-white'
                  : voiceState === 'speaking'
                  ? 'bg-white text-black shadow-mono-glow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              {voiceState === 'listening' ? (
                <Mic className="w-7 h-7" />
              ) : voiceState === 'thinking' ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : voiceState === 'speaking' ? (
                <Volume2 className="w-7 h-7 animate-pulse" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </div>
          </div>
        </div>

        {/* Minimal Voice Status Indicator (No text content / subtitles) */}
        <div className="w-full h-8 flex items-center justify-center text-center px-2 mb-4">
          {errorMessage ? (
            <p className="text-xs text-red-400">{errorMessage}</p>
          ) : (
            <p className="text-xs text-zinc-400 tracking-wide">
              {voiceState === 'listening'
                ? 'Listening...'
                : voiceState === 'thinking'
                ? 'Thinking...'
                : voiceState === 'speaking'
                ? 'Speaking...'
                : 'Tap to speak'}
            </p>
          )}
        </div>

        {/* Minimal Bottom Action Control */}
        <div className="flex items-center justify-center gap-3">
          {voiceState === 'speaking' ? (
            <button
              onClick={() => {
                stopSpeaking();
                startListening();
              }}
              className="px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Interrupt</span>
            </button>
          ) : voiceState === 'listening' ? (
            <button
              onClick={() => {
                if (transcript.trim()) {
                  handleSendVoicePrompt(transcript.trim());
                } else {
                  stopListening();
                  setVoiceState('idle');
                  voiceStateRef.current = 'idle';
                }
              }}
              className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Done</span>
            </button>
          ) : (
            <button
              onClick={startListening}
              className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Speak</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
