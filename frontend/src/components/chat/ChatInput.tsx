'use strict';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Mic,
  MicOff,
  Paperclip,
  X,
  Sparkles,
  Bot,
  Code2,
  BookOpen,
  Palette,
  Shield,
  ShieldAlert,
  Terminal,
  Image as ImageIcon,
  Film,
  FileText,
  FileCode,
  Music,
  FolderArchive,
  Globe,
  Check,
  File as GenericFileIcon,
} from 'lucide-react';
import { scanForSecrets, redactSecrets, SecretScanResult } from '@/lib/secretGuard';
import { SecretWarningModal } from './SecretWarningModal';

interface ChatInputProps {
  onSendMessage: (text: string, file?: File | null, mode?: string | null) => void;
  isGenerating: boolean;
  onStopGeneration?: () => void;
  languageName?: string;
  onOpenStudio?: (tab: 'compiler' | 'image_studio') => void;
  pluginsState?: Record<string, boolean>;
  onTogglePlugin?: (pluginId: string, enabled: boolean) => void;
  onOpenPlugins?: () => void;
  onOpenVoiceMode?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isGenerating,
  onStopGeneration,
  languageName = 'English',
  onOpenStudio,
  pluginsState,
  onTogglePlugin,
  onOpenPlugins,
  onOpenVoiceMode,
}) => {
  const [text, setText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileTypeCategory, setFileTypeCategory] = useState<'image' | 'video' | 'audio' | 'code' | 'doc' | 'other'>('other');
  const [isListening, setIsListening] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fileAcceptFilter, setFileAcceptFilter] = useState<string>('*/*');

  // Secret & Sensitive Data Guard State
  const [secretScan, setSecretScan] = useState<SecretScanResult>({
    hasSecrets: false,
    secrets: [],
    summary: '',
    criticalCount: 0,
  });
  const [showSecretModal, setShowSecretModal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  // Close dropup menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setShowModeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live Secret Scanner on text change
  useEffect(() => {
    const scan = scanForSecrets(text);
    setSecretScan(scan);
  }, [text]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Dedicated robust speech recognition handler
  const toggleVoiceInput = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let baseText = text ? text.trim() + ' ' : '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const newText = (baseText + finalTranscript + interimTranscript).replace(/\s+/g, ' ');
        setText(newText);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied. Please allow microphone permissions in your browser settings.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.warn('Could not start speech recognition:', err);
      alert('Could not access microphone. Please check your browser audio permissions.');
      setIsListening(false);
    }
  };

  const determineCategory = (file: File): 'image' | 'video' | 'audio' | 'code' | 'doc' | 'other' => {
    const type = file.type.toLowerCase();
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico', 'tiff'].includes(ext)) {
      return 'image';
    }
    if (type.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', 'flv', 'm4v'].includes(ext)) {
      return 'video';
    }
    if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'].includes(ext)) {
      return 'audio';
    }
    if (['py', 'js', 'ts', 'tsx', 'jsx', 'cpp', 'c', 'h', 'hpp', 'rs', 'go', 'java', 'html', 'css', 'sql', 'sh', 'bash', 'yaml', 'yml', 'json', 'toml', 'env', 'dockerfile', 'rb', 'php', 'swift', 'kt'].includes(ext)) {
      return 'code';
    }
    if (type.includes('pdf') || ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xlsx', 'xls', 'pptx', 'rtf'].includes(ext)) {
      return 'doc';
    }
    return 'other';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      const cat = determineCategory(file);
      setFileTypeCategory(cat);

      if (cat === 'image' || cat === 'video') {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleTriggerAttachOption = (acceptFilter: string) => {
    setFileAcceptFilter(acceptFilter);
    setShowAttachMenu(false);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.accept = acceptFilter;
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }, 50);
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    if (pastedText) {
      const scan = scanForSecrets(pastedText);
      if (scan.hasSecrets) {
        setShowSecretModal(true);
      }
    }
  };

  const handleAutoRedact = () => {
    const redacted = redactSecrets(text, secretScan.secrets);
    setText(redacted);
    setShowSecretModal(false);
  };

  const handleProceedAnyway = () => {
    setShowSecretModal(false);
    handleSubmit(undefined, true);
  };

  const handleSubmit = (e?: React.FormEvent, bypassSecretCheck = false) => {
    if (e) e.preventDefault();
    if (isGenerating) return;
    if (!text.trim() && !attachedFile) return;

    if (!bypassSecretCheck && secretScan.hasSecrets) {
      setShowSecretModal(true);
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    onSendMessage(text.trim(), attachedFile, selectedMode);
    setText('');
    removeFile();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const modes = [
    { id: 'Developer', label: 'Developer / Code', icon: Code2 },
    { id: 'Academic', label: 'Academic / Research', icon: BookOpen },
    { id: 'Creative', label: 'Creative Writer', icon: Palette },
    { id: 'Security', label: 'Security Auditor', icon: Shield },
  ];

  const attachmentOptions = [
    {
      id: 'images',
      title: 'Photos & Images',
      icon: ImageIcon,
      accept: 'image/*,.png,.jpg,.jpeg,.webp,.svg,.gif,.bmp,.ico',
    },
    {
      id: 'videos',
      title: 'Videos',
      icon: Film,
      accept: 'video/*,.mp4,.webm,.mov,.mkv,.avi,.wmv,.flv',
    },
    {
      id: 'documents',
      title: 'Documents & PDFs',
      icon: FileText,
      accept: '.pdf,.doc,.docx,.txt,.md,.csv,.json,.xlsx,.xls,.pptx,.rtf',
    },
    {
      id: 'code',
      title: 'Code & Scripts',
      icon: FileCode,
      accept: '.py,.js,.ts,.tsx,.jsx,.cpp,.c,.h,.hpp,.rs,.go,.java,.html,.css,.sql,.sh,.bash,.yaml,.yml,.json,.toml,.env,.dockerfile',
    },
    {
      id: 'audio',
      title: 'Audio',
      icon: Music,
      accept: 'audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac',
    },
    {
      id: 'all',
      title: 'Browse all files...',
      icon: FolderArchive,
      accept: '*/*',
    },
  ];

  return (
    <div className="relative max-w-4xl mx-auto w-full px-3 pb-3">
      {/* File Preview Chip with Rich Multimodal Badge & Size */}
      {attachedFile && (
        <div className="mb-2 inline-flex items-center gap-2.5 p-2 pl-3 rounded-2xl bg-zinc-900/95 border border-zinc-700 text-xs text-zinc-100 shadow-xl backdrop-blur-md animate-slide-up">
          {/* Media Thumbnail / Icon */}
          {fileTypeCategory === 'image' && previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-9 h-9 rounded-xl object-cover border border-zinc-600 shadow-sm"
            />
          ) : fileTypeCategory === 'video' ? (
            <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-700 flex items-center justify-center">
              <Film className="w-5 h-5 text-rose-400" />
            </div>
          ) : fileTypeCategory === 'audio' ? (
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-700 flex items-center justify-center">
              <Music className="w-5 h-5 text-amber-400" />
            </div>
          ) : fileTypeCategory === 'code' ? (
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-700 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-cyan-400" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <FileText className="w-5 h-5 text-zinc-300" />
            </div>
          )}

          {/* File Name & Details */}
          <div className="flex flex-col min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                {attachedFile.name}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase bg-zinc-800 border border-zinc-700 text-zinc-300">
                {fileTypeCategory}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              {formatFileSize(attachedFile.size)} • Ready to inspect
            </span>
          </div>

          {/* Remove Button */}
          <button
            type="button"
            onClick={removeFile}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Mode Pill */}
      {selectedMode && (
        <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white animate-slide-up">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>Mode: <strong>{selectedMode}</strong></span>
          <button
            onClick={() => setSelectedMode(null)}
            className="ml-1 text-zinc-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Real-time Sensitive Secret Guard Banner */}
      {secretScan.hasSecrets && (
        <div className="mb-2 p-2.5 rounded-xl bg-amber-950/70 border border-amber-600/80 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg shadow-amber-950/30 animate-slide-up">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
            <span className="font-semibold text-amber-300 truncate">
              {secretScan.summary}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleAutoRedact}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-all shadow"
            >
              Auto-Redact
            </button>
            <button
              type="button"
              onClick={() => setShowSecretModal(true)}
              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-[11px] transition-colors"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 focus-within:border-white shadow-mono-card transition-all focus-within:shadow-mono-glow">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            isListening
              ? 'Listening to your voice... Speak now'
              : selectedMode
              ? `Ask anything in ${selectedMode} mode...`
              : 'Message Phantom AI... (Shift+Enter for new line)'
          }
          rows={1}
          className="w-full bg-transparent text-white placeholder-zinc-500 text-sm px-4 pt-3.5 pb-12 focus:outline-none resize-none max-h-44 min-h-[52px]"
        />

        {/* Hidden Dynamic File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={fileAcceptFilter}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Composer Controls Bar */}
        <div className="absolute left-2 right-2 bottom-2 flex items-center justify-between pointer-events-auto">
          {/* Left tools: Persona, Attach Dropup, Web Search, Voice */}
          <div className="flex items-center gap-1">
            {/* 1. Mode / Persona Dropup Toggle */}
            <div className="relative" ref={modeMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowModeMenu(!showModeMenu);
                  setShowAttachMenu(false);
                }}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
                  selectedMode
                    ? 'bg-zinc-800 text-white border border-zinc-600'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
                title="Select Assistant Persona or Studio"
              >
                <Bot className="w-4 h-4 text-white" />
                <span className="hidden sm:inline text-[11px] font-medium">
                  {selectedMode || 'Persona & Tools'}
                </span>
              </button>

              {/* Mode Menu Dropdown */}
              {showModeMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-64 p-1.5 rounded-2xl glass-dropdown border border-zinc-700 shadow-2xl z-50 bg-zinc-950/95 backdrop-blur-xl animate-fade-in">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Dev & Creative Studios
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModeMenu(false);
                      onOpenStudio?.('compiler');
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-900 hover:text-white transition-colors group"
                  >
                    <div className="p-1 rounded bg-zinc-900 border border-zinc-700 group-hover:border-zinc-500">
                      <Terminal className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Web Editor & Dev Studio</div>
                      <div className="text-[10px] text-zinc-400">Project files and live preview</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModeMenu(false);
                      onOpenStudio?.('image_studio');
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-zinc-900 hover:text-white transition-colors group mt-0.5"
                  >
                    <div className="p-1 rounded bg-zinc-900 border border-zinc-700 group-hover:border-zinc-500">
                      <ImageIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">AI Image Studio</div>
                      <div className="text-[10px] text-zinc-400">Generative diffusion art</div>
                    </div>
                  </button>

                  <div className="my-1.5 border-t border-zinc-800" />

                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    AI Personas
                  </div>
                  {modes.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMode(m.id);
                          setShowModeMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                          selectedMode === m.id
                            ? 'bg-zinc-800 text-white font-semibold'
                            : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-white" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                  {selectedMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode(null);
                        setShowModeMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 mt-1 border-t border-zinc-800"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset to Default Persona</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Paperclip Attachment Dropup Menu (Images, Video, Docs, Code, Audio, Any) */}
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(!showAttachMenu);
                  setShowModeMenu(false);
                }}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  showAttachMenu || attachedFile
                    ? 'bg-zinc-800 text-white border border-zinc-600 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
                title="Attach Images, Videos, Documents, Code, or any file"
                aria-label="Attach File"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Minimal Clean Attachment Dropdown */}
              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-56 p-1 rounded-xl glass-dropdown border border-zinc-700 shadow-xl z-50 bg-zinc-950/95 backdrop-blur-xl animate-fade-in">
                  <div className="space-y-0.5">
                    {attachmentOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleTriggerAttachOption(opt.accept)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-850 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left font-medium group"
                        >
                          <Icon className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                          <span>{opt.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Web Search Toggle Button */}
            <button
              type="button"
              onClick={() => onTogglePlugin?.('web_search', !(pluginsState?.web_search ?? true))}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                (pluginsState?.web_search ?? true)
                  ? 'text-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/50'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850'
              }`}
              title={(pluginsState?.web_search ?? true) ? 'Web Search active (click to toggle)' : 'Enable Web Search'}
            >
              <Globe className="w-4 h-4" />
              {(pluginsState?.web_search ?? true) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            {/* 4. Voice Input Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                isListening
                  ? 'bg-zinc-800 text-white border border-white animate-pulse'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
              title={isListening ? 'Stop listening' : 'Voice Input (Speech-to-Text)'}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 text-white" />
                  <div className="flex items-center gap-0.5 h-4">
                    <span className="sound-bar" />
                    <span className="sound-bar" />
                    <span className="sound-bar" />
                    <span className="sound-bar" />
                  </div>
                </>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* 5. Live Hands-Free Voice Mode Button */}
            {onOpenVoiceMode && (
              <button
                type="button"
                onClick={onOpenVoiceMode}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Open Live Hands-Free Conversational Voice Mode"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-medium hidden sm:inline-block">Voice Mode</span>
              </button>
            )}
          </div>

          {/* Right tool: Send / Stop button */}
          <div>
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-600 hover:bg-zinc-700 transition-all cursor-pointer"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!text.trim() && !attachedFile}
                className={`p-2 rounded-xl font-medium transition-all ${
                  text.trim() || attachedFile
                    ? 'bg-white text-black shadow-mono-glow hover:bg-zinc-200 hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <Send className="w-4 h-4 text-black" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Secret & Sensitive Credential Warning Modal */}
      <SecretWarningModal
        isOpen={showSecretModal}
        secrets={secretScan.secrets}
        onClose={() => setShowSecretModal(false)}
        onRedactAndApply={handleAutoRedact}
        onProceedAnyway={handleProceedAnyway}
      />
    </div>
  );
};
