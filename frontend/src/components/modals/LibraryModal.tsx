'use strict';
import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Pin,
  MessageSquare,
  Code2,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Search,
  ExternalLink,
  Copy,
  Check,
  Download,
  Trash2,
  Eye,
  Terminal,
  FileCode,
  Layers,
} from 'lucide-react';
import { ChatSession } from '@/types';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onTogglePinSession?: (id: string) => void;
  onOpenStudio?: (tab: any) => void;
  onSendPromptToChat?: (prompt: string) => void;
}

type LibraryTab = 'pinned' | 'images' | 'docs' | 'prompts' | 'snippets';

interface GeneratedImageItem {
  id: string;
  original_prompt: string;
  enhanced_prompt?: string;
  image_url: string;
  created_at?: string;
}

interface WorkspaceDocItem {
  id: string;
  name: string;
  type: string;
  size: string;
  content: string;
  date?: string;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onTogglePinSession,
  onOpenStudio,
  onSendPromptToChat,
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('pinned');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImageItem[]>([]);
  const [selectedPreviewImg, setSelectedPreviewImg] = useState<GeneratedImageItem | null>(null);
  const [selectedDocPreview, setSelectedDocPreview] = useState<WorkspaceDocItem | null>(null);

  const pinnedSessions = sessions.filter((s) => Boolean(s.is_pinned));

  // Default workspace documents & files
  const [docs, setDocs] = useState<WorkspaceDocItem[]>([
    {
      id: 'doc-1',
      name: 'system_architecture_spec.md',
      type: 'markdown',
      size: '4.2 KB',
      date: 'Today',
      content: `# Phantom AI 2.0 System Architecture\n\n## Subsystems\n- **Flask API Core**: Multi-model routing, SSE streaming, authentication.\n- **Subprocess Compiler**: Isolated execution sandbox for 30+ programming languages.\n- **Dual Persistence**: Relational PostgreSQL with local SQLite auto-fallback.\n- **Web Push Engine**: Real-time background trigger notifications.`,
    },
    {
      id: 'doc-2',
      name: 'api_routes_documentation.json',
      type: 'json',
      size: '2.8 KB',
      date: 'Yesterday',
      content: `{\n  "endpoints": [\n    { "path": "/api/chat/stream", "method": "POST", "desc": "SSE AI Streaming" },\n    { "path": "/api/run_code", "method": "POST", "desc": "Multi-Language Compiler" },\n    { "path": "/api/notifications/push", "method": "POST", "desc": "Web Push & FMC" },\n    { "path": "/api/user/subscription", "method": "GET", "desc": "Tier Limits & Quota" }\n  ]\n}`,
    },
    {
      id: 'doc-3',
      name: 'quicksort_benchmark.py',
      type: 'python',
      size: '1.5 KB',
      date: '3 days ago',
      content: `import time, random\n\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n\ndata = [random.randint(0, 100000) for _ in range(20000)]\nt0 = time.perf_counter()\nres = quicksort(data)\nprint(f"Sorted {len(res)} items in {time.perf_counter() - t0:.4f}s")`,
    },
  ]);

  const savedPrompts = [
    {
      id: 'p1',
      title: 'Full-Stack Architecture Spec',
      category: 'System Design',
      prompt: 'Act as a Principal System Architect. Design a production-grade microservices architecture for real-time collaborative applications with PostgreSQL, Redis, and WebSockets.',
    },
    {
      id: 'p2',
      title: 'TypeScript Performance Optimizer',
      category: 'Code Optimization',
      prompt: 'Analyze this TypeScript code for memory leaks, O(N^2) bottlenecks, and unnecessary re-renders. Provide zero-dependency optimized alternatives.',
    },
    {
      id: 'p3',
      title: 'REST API & OpenAPI Generator',
      category: 'Backend',
      prompt: 'Create a comprehensive REST API schema with CRUD operations, JWT authentication middleware, rate limiting, and OpenAPI 3.1 Swagger specifications.',
    },
    {
      id: 'p4',
      title: 'Algorithm Diagnostics & Big-O Analysis',
      category: 'Algorithms',
      prompt: 'Evaluate the time and space complexity of the algorithm below. Suggest dynamic programming or two-pointer strategies to improve asymptotic performance.',
    },
  ];

  const codeSnippets = [
    {
      id: 's1',
      title: 'Multi-Threaded HTTP Worker',
      lang: 'Python',
      code: `import concurrent.futures\nimport urllib.request\n\ndef fetch(url):\n    with urllib.request.urlopen(url, timeout=5) as res:\n        return url, res.status\n\nwith concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:\n    results = list(ex.map(fetch, ['https://google.com', 'https://github.com']))\nprint(results)`,
    },
    {
      id: 's2',
      title: 'Debounced Search Hook',
      lang: 'TypeScript',
      code: `import { useState, useEffect } from 'react';\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  const [debouncedValue, setDebouncedValue] = useState(value);\n  useEffect(() => {\n    const handler = setTimeout(() => setDebouncedValue(value), delay);\n    return () => clearTimeout(handler);\n  }, [value, delay]);\n  return debouncedValue;\n}`,
    },
    {
      id: 's3',
      title: 'QuickSort In-Place',
      lang: 'C++',
      code: `#include <vector>\n#include <iostream>\n\nvoid quickSort(std::vector<int>& arr, int low, int high) {\n    if (low < high) {\n        int pivot = arr[high], i = low - 1;\n        for (int j = low; j < high; j++) {\n            if (arr[j] < pivot) std::swap(arr[++i], arr[j]);\n        }\n        std::swap(arr[i + 1], arr[high]);\n        int pi = i + 1;\n        quickSort(arr, low, pi - 1);\n        quickSort(arr, pi + 1, high);\n    }\n}`,
    },
  ];

  // Fetch user image gallery when open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/images')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.images)) {
            setImages(data.images);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadDoc = (doc: WorkspaceDocItem) => {
    const blob = new Blob([doc.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-4xl h-[85vh] max-h-[720px] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-bold text-white tracking-wide">Library</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation & Search */}
        <div className="p-3 border-b border-zinc-850 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-zinc-950">
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-850 text-xs font-semibold overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab('pinned')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'pinned'
                  ? 'bg-zinc-800 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>Pinned</span>
            </button>

            <button
              onClick={() => setActiveTab('images')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'images'
                  ? 'bg-zinc-800 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Images</span>
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'docs'
                  ? 'bg-zinc-800 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Files</span>
            </button>

            <button
              onClick={() => setActiveTab('prompts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'prompts'
                  ? 'bg-zinc-800 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prompts</span>
            </button>

            <button
              onClick={() => setActiveTab('snippets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'snippets'
                  ? 'bg-zinc-800 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Snippets</span>
            </button>
          </div>

          <div className="relative w-full md:w-56 flex-shrink-0">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-zinc-950">
          {/* 1. PINNED CHATS */}
          {activeTab === 'pinned' && (
            <div className="space-y-2">
              {pinnedSessions.length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <Pin className="w-8 h-8 text-zinc-800 mx-auto" />
                  <p className="text-xs font-semibold text-zinc-300">No pinned conversations yet</p>
                  <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                    Hover over any chat session in the sidebar and click the pin icon to save conversations here.
                  </p>
                </div>
              ) : (
                pinnedSessions.map((session) => (
                  <div
                    key={session.session_id}
                    onClick={() => {
                      onSelectSession(session.session_id);
                      onClose();
                    }}
                    className="p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 cursor-pointer flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-zinc-800 text-white">
                        <Pin className="w-3.5 h-3.5 fill-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                          {session.title || 'Untitled Session'}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          Session ID: {session.session_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePinSession?.(session.session_id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors"
                        title="Unpin session"
                      >
                        Unpin
                      </button>
                      <button
                        className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                        title="Open chat"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. GENERATED IMAGES & GALLERY */}
          {activeTab === 'images' && (
            <div>
              {images.length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-zinc-800 mx-auto" />
                  <p className="text-xs font-semibold text-zinc-300">No generated images yet</p>
                  <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                    Ask Phantom AI to generate an image or use the AI Image Studio. All high-res renders are archived here.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenStudio?.('image_studio');
                    }}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold"
                  >
                    Open Image Studio
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {images
                    .filter(
                      (img) =>
                        img.original_prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (img.enhanced_prompt && img.enhanced_prompt.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((img) => (
                      <div
                        key={img.id}
                        className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-850 hover:border-zinc-700 transition-all space-y-2 group flex flex-col justify-between"
                      >
                        <div
                          className="relative aspect-video rounded-xl overflow-hidden bg-black cursor-pointer group"
                          onClick={() => setSelectedPreviewImg(img)}
                        >
                          <img
                            src={img.image_url}
                            alt={img.original_prompt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <span className="p-2 rounded-xl bg-black/70 text-white">
                              <Eye className="w-4 h-4" />
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-white font-medium line-clamp-2 leading-relaxed">
                            {img.original_prompt}
                          </p>
                          <span className="text-[10px] text-zinc-500 font-mono block">
                            Flux.1 / SD-XL Studio Render
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800">
                          <button
                            onClick={() => handleCopy(img.image_url, img.id)}
                            className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                          >
                            {copiedId === img.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === img.id ? 'Copied URL' : 'Copy URL'}</span>
                          </button>
                          <a
                            href={img.image_url}
                            target="_blank"
                            download={`phantom_art_${img.id}.png`}
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                            title="Download full resolution"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 3. DOCUMENTS & WORKSPACE FILES */}
          {activeTab === 'docs' && (
            <div className="space-y-2">
              {docs.length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <FileText className="w-8 h-8 text-zinc-800 mx-auto" />
                  <p className="text-xs font-semibold text-zinc-300">No files in workspace</p>
                </div>
              ) : (
                docs
                  .filter(
                    (d) =>
                      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.content.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2.5 rounded-xl bg-zinc-800 text-white flex-shrink-0">
                          {doc.type === 'python' || doc.type === 'json' ? (
                            <FileCode className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-zinc-200" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                            {doc.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span>{doc.type.toUpperCase()}</span>
                            <span>•</span>
                            <span>{doc.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedDocPreview(doc)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => handleDownloadDoc(doc)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            onSendPromptToChat?.(
                              `Please analyze this document (${doc.name}):\n\n\`\`\`${doc.type}\n${doc.content}\n\`\`\``
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-200 text-black text-[11px] font-bold transition-all"
                        >
                          Ask AI
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* 4. PROMPTS */}
          {activeTab === 'prompts' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedPrompts
                .filter(
                  (p) =>
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.prompt.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex flex-col justify-between space-y-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold uppercase">
                          {p.category}
                        </span>
                        <button
                          onClick={() => handleCopy(p.prompt, p.id)}
                          className="p-1 text-zinc-400 hover:text-white"
                          title="Copy prompt"
                        >
                          {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-200">{p.title}</h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed font-sans">{p.prompt}</p>
                    </div>

                    <button
                      onClick={() => onSendPromptToChat?.(p.prompt)}
                      className="w-full py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors text-center"
                    >
                      {copiedId === p.id ? 'Copied to Clipboard!' : 'Use This Prompt'}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* 5. CODE SNIPPETS */}
          {activeTab === 'snippets' && (
            <div className="space-y-3">
              {codeSnippets
                .filter(
                  (s) =>
                    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.lang.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((s) => (
                  <div key={s.id} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200">{s.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                          {s.lang}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(s.code, s.id)}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white font-mono"
                        >
                          {copiedId === s.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === s.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => {
                            onClose();
                            onOpenStudio?.('compiler');
                          }}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>Run</span>
                        </button>
                      </div>
                    </div>
                    <pre className="p-3 rounded-xl bg-black border border-zinc-800 text-xs text-zinc-300 font-mono overflow-x-auto custom-scrollbar">
                      <code>{s.code}</code>
                    </pre>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Modal: Full Image Viewer */}
        {selectedPreviewImg && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in"
            onClick={() => setSelectedPreviewImg(null)}
          >
            <div
              className="max-w-3xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">High-Definition Render Preview</h4>
                <button onClick={() => setSelectedPreviewImg(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={selectedPreviewImg.image_url}
                alt={selectedPreviewImg.original_prompt}
                className="w-full max-h-[55vh] object-contain rounded-2xl border border-zinc-850"
              />
              <p className="text-xs text-zinc-300 font-sans">{selectedPreviewImg.original_prompt}</p>
              <div className="flex items-center justify-end gap-2">
                <a
                  href={selectedPreviewImg.image_url}
                  download="phantom_hd_art.png"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-subtle flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Document Previewer */}
        {selectedDocPreview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in"
            onClick={() => setSelectedDocPreview(null)}
          >
            <div
              className="max-w-3xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {selectedDocPreview.name}
                </h4>
                <button onClick={() => setSelectedDocPreview(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-black border border-zinc-850 text-xs text-zinc-300 font-mono max-h-[50vh] overflow-y-auto custom-scrollbar">
                <code>{selectedDocPreview.content}</code>
              </pre>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => handleDownloadDoc(selectedDocPreview)}
                  className="px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-subtle flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-zinc-850 flex items-center justify-between flex-shrink-0 bg-zinc-950">
          <span className="text-[11px] text-zinc-500 font-mono">Phantom AI Workspace Asset Library</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-subtle transition-all active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
