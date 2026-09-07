import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Square,
  Wrench,
  HelpCircle,
  Zap,
  CheckCircle,
  FileCode,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Terminal,
  Activity,
  Code,
  Globe,
  Monitor,
  Folder,
  Layers,
  X,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Save,
  FolderOpen,
  Download,
  Upload,
  Search,
  Replace,
  Maximize2,
  Minimize2,
  Smartphone,
  Tablet,
  Laptop,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Send,
  Cpu,
  Clock,
  Code2,
  FileText,
  Boxes,
  Plus,
  Filter,
  Eye,
  Cloud,
  CloudOff,
  Lock,
  CheckCheck,
  AlertTriangle,
  Radio,
  Network,
  StopCircle,
  CornerDownLeft,
  Settings,
  ShieldCheck,
  TerminalSquare,
  Flame,
  CheckCircle2,
  Keyboard,
  Command,
} from 'lucide-react';
import JSZip from 'jszip';
import { api } from '@/lib/api';
import {
  AIActionResponse,
  UserProfile,
  TerminalEntry,
  TerminalTab,
  TerminalAIAssistResponse,
  PortStatus,
} from '@/types';
import { PhantomLogo } from '../common/PhantomLogo';
import { FileIcon } from '../common/FileIcon';

interface DevStudioProps {
  initialCode?: string;
  initialLanguage?: string;
  onBackToChat?: () => void;
  isAuthenticated?: boolean;
  userProfile?: UserProfile | null;
  onOpenAuth?: () => void;
}

interface VirtualFile {
  name: string;
  content: string;
  language: string;
}

interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: Record<string, FileTreeNode>;
  file?: VirtualFile;
}

interface FileRunConfig {
  engine: 'web' | 'compiler';
  actionName: string;
  badgeLabel: string;
  iconType: 'play' | 'globe' | 'terminal' | 'eye' | 'code';
  runnerLanguage: string;
  defaultTab: 'preview' | 'terminal' | 'console';
}

interface ConsoleLog {
  id: string;
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
}

interface ProjectRecord {
  id: string;
  name: string;
  template: string;
  created_at: string;
  last_updated: string;
}

const getLanguageForFilename = (filename: string): string => {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  if (['html', 'htm', 'xhtml', 'vue', 'svelte'].includes(ext)) return 'html';
  if (['css', 'scss', 'sass', 'less'].includes(ext)) return 'css';
  if (['py', 'pyw', 'pyc', 'rpy', 'ipynb'].includes(ext)) return 'python';
  if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) return 'javascript';
  if (['ts', 'tsx', 'mts', 'cts', 'd.ts'].includes(ext)) return 'typescript';
  if (['java', 'jar', 'jav'].includes(ext)) return 'java';
  if (['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx', 'hh'].includes(ext)) return 'cpp';
  if (['c', 'h'].includes(ext)) return 'c';
  if (['cs', 'csx'].includes(ext)) return 'csharp';
  if (['rs'].includes(ext)) return 'rust';
  if (['go'].includes(ext)) return 'go';
  if (['php', 'phtml', 'php3', 'php4', 'php5'].includes(ext)) return 'php';
  if (['rb', 'erb', 'rake', 'gemspec'].includes(ext)) return 'ruby';
  if (['kt', 'kts'].includes(ext)) return 'kotlin';
  if (['swift'].includes(ext)) return 'swift';
  if (['dart'].includes(ext)) return 'dart';
  if (['scala', 'sc'].includes(ext)) return 'scala';
  if (['r', 'rmd'].includes(ext)) return 'r';
  if (['lua'].includes(ext)) return 'lua';
  if (['pl', 'pm'].includes(ext)) return 'perl';
  if (['sql', 'pgsql', 'mysql'].includes(ext)) return 'sql';
  if (['json', 'jsonc', 'json5'].includes(ext)) return 'json';
  if (['yaml', 'yml'].includes(ext)) return 'yaml';
  if (['toml'].includes(ext)) return 'toml';
  if (['xml', 'svg', 'xaml'].includes(ext)) return 'xml';
  if (['sh', 'bash', 'zsh', 'ksh'].includes(ext)) return 'bash';
  if (['ps1', 'psm1', 'psd1'].includes(ext)) return 'powershell';
  if (['bat', 'cmd'].includes(ext)) return 'batch';
  if (['md', 'markdown', 'mdx'].includes(ext)) return 'markdown';
  return 'text';
};

const getRunConfigForFile = (filename: string, hasWebRoot: boolean): FileRunConfig => {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';

  // 1. Web Documents & Frontend
  if (['html', 'htm', 'xhtml', 'vue', 'svelte'].includes(ext)) {
    return {
      engine: 'web',
      actionName: 'Preview Web Page',
      badgeLabel: 'Preview HTML',
      iconType: 'globe',
      runnerLanguage: 'html',
      defaultTab: 'preview',
    };
  }

  if (['css', 'scss', 'sass', 'less'].includes(ext)) {
    return {
      engine: 'web',
      actionName: 'Preview Styles',
      badgeLabel: 'Preview CSS',
      iconType: 'globe',
      runnerLanguage: 'css',
      defaultTab: 'preview',
    };
  }

  // 2. Python
  if (['py', 'pyw', 'pyc', 'rpy', 'ipynb'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run Python Script',
      badgeLabel: 'Run Python',
      iconType: 'play',
      runnerLanguage: 'python',
      defaultTab: 'terminal',
    };
  }

  // 3. JavaScript / TypeScript
  if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) {
    if (hasWebRoot) {
      return {
        engine: 'web',
        actionName: 'Preview Web App',
        badgeLabel: 'Preview JS',
        iconType: 'globe',
        runnerLanguage: 'javascript',
        defaultTab: 'preview',
      };
    }
    return {
      engine: 'compiler',
      actionName: 'Run Node.js',
      badgeLabel: 'Run Node.js',
      iconType: 'play',
      runnerLanguage: 'javascript',
      defaultTab: 'terminal',
    };
  }

  if (['ts', 'tsx', 'mts', 'cts'].includes(ext)) {
    if (hasWebRoot) {
      return {
        engine: 'web',
        actionName: 'Preview React / TSX',
        badgeLabel: 'Preview TSX',
        iconType: 'globe',
        runnerLanguage: 'typescript',
        defaultTab: 'preview',
      };
    }
    return {
      engine: 'compiler',
      actionName: 'Run TypeScript',
      badgeLabel: 'Run TypeScript',
      iconType: 'play',
      runnerLanguage: 'typescript',
      defaultTab: 'terminal',
    };
  }

  // 4. C & C++
  if (['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx', 'hh'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Compile & Run C++',
      badgeLabel: 'Run C++',
      iconType: 'play',
      runnerLanguage: 'cpp',
      defaultTab: 'terminal',
    };
  }

  if (['c', 'h'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Compile & Run C',
      badgeLabel: 'Run C',
      iconType: 'play',
      runnerLanguage: 'c',
      defaultTab: 'terminal',
    };
  }

  // 5. C#
  if (['cs', 'csx'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Compile & Run C#',
      badgeLabel: 'Run C#',
      iconType: 'play',
      runnerLanguage: 'csharp',
      defaultTab: 'terminal',
    };
  }

  // 6. Rust
  if (['rs'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Compile & Run Rust',
      badgeLabel: 'Run Rust',
      iconType: 'play',
      runnerLanguage: 'rust',
      defaultTab: 'terminal',
    };
  }

  // 7. Go
  if (['go'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run Go Program',
      badgeLabel: 'Run Go',
      iconType: 'play',
      runnerLanguage: 'go',
      defaultTab: 'terminal',
    };
  }

  // 8. Java
  if (['java', 'jar', 'jav'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Compile & Run Java',
      badgeLabel: 'Run Java',
      iconType: 'play',
      runnerLanguage: 'java',
      defaultTab: 'terminal',
    };
  }

  // 9. PHP
  if (['php', 'phtml', 'php3', 'php4', 'php5'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run PHP Script',
      badgeLabel: 'Run PHP',
      iconType: 'play',
      runnerLanguage: 'php',
      defaultTab: 'terminal',
    };
  }

  // 10. Ruby
  if (['rb', 'erb', 'rake'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run Ruby Script',
      badgeLabel: 'Run Ruby',
      iconType: 'play',
      runnerLanguage: 'ruby',
      defaultTab: 'terminal',
    };
  }

  // 11. Kotlin
  if (['kt', 'kts'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Compile & Run Kotlin',
      badgeLabel: 'Run Kotlin',
      iconType: 'play',
      runnerLanguage: 'kotlin',
      defaultTab: 'terminal',
    };
  }

  // 12. Swift
  if (['swift'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run Swift',
      badgeLabel: 'Run Swift',
      iconType: 'play',
      runnerLanguage: 'swift',
      defaultTab: 'terminal',
    };
  }

  // 13. Dart
  if (['dart'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run Dart',
      badgeLabel: 'Run Dart',
      iconType: 'play',
      runnerLanguage: 'dart',
      defaultTab: 'terminal',
    };
  }

  // 14. Scala
  if (['scala', 'sc'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run Scala',
      badgeLabel: 'Run Scala',
      iconType: 'play',
      runnerLanguage: 'scala',
      defaultTab: 'terminal',
    };
  }

  // 15. R
  if (['r', 'rmd'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run R Script',
      badgeLabel: 'Run R',
      iconType: 'play',
      runnerLanguage: 'r',
      defaultTab: 'terminal',
    };
  }

  // 16. Lua
  if (['lua'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run Lua Script',
      badgeLabel: 'Run Lua',
      iconType: 'play',
      runnerLanguage: 'lua',
      defaultTab: 'terminal',
    };
  }

  // 17. Perl
  if (['pl', 'pm'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run Perl Script',
      badgeLabel: 'Run Perl',
      iconType: 'play',
      runnerLanguage: 'perl',
      defaultTab: 'terminal',
    };
  }

  // 18. SQL
  if (['sql', 'pgsql', 'mysql'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Execute SQL Query',
      badgeLabel: 'Run SQL',
      iconType: 'play',
      runnerLanguage: 'sql',
      defaultTab: 'terminal',
    };
  }

  // 19. Shell / Bash
  if (['sh', 'bash', 'zsh', 'ksh'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run Shell Script',
      badgeLabel: 'Run Shell',
      iconType: 'terminal',
      runnerLanguage: 'bash',
      defaultTab: 'terminal',
    };
  }

  // 20. PowerShell
  if (['ps1', 'psm1', 'psd1'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run PowerShell Script',
      badgeLabel: 'Run PowerShell',
      iconType: 'terminal',
      runnerLanguage: 'powershell',
      defaultTab: 'terminal',
    };
  }

  // 21. Batch
  if (['bat', 'cmd'].includes(ext)) {
    return {
      engine: 'compiler',
      actionName: 'Run Batch Script',
      badgeLabel: 'Run Batch',
      iconType: 'terminal',
      runnerLanguage: 'batch',
      defaultTab: 'terminal',
    };
  }

  // 22. Markdown / Text
  if (['md', 'markdown', 'mdx', 'txt'].includes(ext)) {
    return {
      engine: 'web',
      actionName: 'Preview Document',
      badgeLabel: 'Preview Doc',
      iconType: 'eye',
      runnerLanguage: 'markdown',
      defaultTab: 'preview',
    };
  }

  return {
    engine: 'compiler',
    actionName: `Run ${ext.toUpperCase() || 'Code'}`,
    badgeLabel: `Run ${ext ? ext.toUpperCase() : 'Code'}`,
    iconType: 'play',
    runnerLanguage: ext || 'code',
    defaultTab: 'terminal',
  };
};

const getLanguageDisplayName = (filename?: string, lang?: string): string => {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  if (['py', 'pyw', 'rpy', 'ipynb'].includes(ext) || lang === 'python') return 'Python 3';
  if (['java', 'jar', 'jav'].includes(ext) || lang === 'java') return 'Java';
  if (['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx'].includes(ext) || lang === 'cpp') return 'C++';
  if (['c', 'h'].includes(ext) || lang === 'c') return 'C';
  if (['cs', 'csx'].includes(ext) || lang === 'csharp') return 'C#';
  if (['js', 'mjs', 'cjs', 'jsx'].includes(ext) || lang === 'javascript') return 'Node.js';
  if (['ts', 'tsx', 'mts', 'cts'].includes(ext) || lang === 'typescript') return 'TypeScript';
  if (ext === 'rs' || lang === 'rust') return 'Rust';
  if (ext === 'go' || lang === 'go') return 'Go';
  if (['php', 'phtml', 'php3', 'php4', 'php5'].includes(ext) || lang === 'php') return 'PHP';
  if (['rb', 'erb', 'rake'].includes(ext) || lang === 'ruby') return 'Ruby';
  if (['kt', 'kts'].includes(ext) || lang === 'kotlin') return 'Kotlin';
  if (ext === 'swift' || lang === 'swift') return 'Swift';
  if (ext === 'dart' || lang === 'dart') return 'Dart';
  if (['scala', 'sc'].includes(ext) || lang === 'scala') return 'Scala';
  if (['r', 'rmd'].includes(ext) || lang === 'r') return 'R';
  if (ext === 'lua' || lang === 'lua') return 'Lua';
  if (['pl', 'pm'].includes(ext) || lang === 'perl') return 'Perl';
  if (['html', 'htm', 'xhtml', 'vue', 'svelte'].includes(ext) || lang === 'html') return 'Web HTML';
  if (['css', 'scss', 'sass', 'less'].includes(ext) || lang === 'css') return 'CSS Styles';
  if (['json', 'jsonc', 'json5'].includes(ext)) return 'JSON / Data';
  if (['yaml', 'yml'].includes(ext)) return 'YAML Config';
  if (ext === 'toml') return 'TOML Config';
  if (['xml', 'svg'].includes(ext)) return 'XML / SVG';
  if (['sh', 'bash', 'zsh', 'ksh'].includes(ext) || lang === 'bash') return 'Shell Script';
  if (['ps1', 'psm1', 'psd1'].includes(ext) || lang === 'powershell') return 'PowerShell';
  if (['bat', 'cmd'].includes(ext) || lang === 'batch') return 'Windows Batch';
  if (['sql', 'pgsql', 'mysql'].includes(ext) || lang === 'sql') return 'SQL Database';
  if (['md', 'markdown', 'mdx', 'txt'].includes(ext) || lang === 'markdown') return 'Markdown Doc';
  return (lang || ext || 'Code').toUpperCase();
};

const getLanguageIcon = (filename?: string, lang?: string): string => {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  if (['py', 'pyw', 'rpy', 'ipynb'].includes(ext) || lang === 'python') return '🐍';
  if (['java', 'jar', 'jav'].includes(ext) || lang === 'java') return '☕';
  if (['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx'].includes(ext) || lang === 'cpp') return '⚡';
  if (['c', 'h'].includes(ext) || lang === 'c') return '⚡';
  if (['cs', 'csx'].includes(ext) || lang === 'csharp') return '🔷';
  if (['js', 'mjs', 'cjs', 'jsx'].includes(ext) || lang === 'javascript') return '🟨';
  if (['ts', 'tsx', 'mts', 'cts'].includes(ext) || lang === 'typescript') return '🔷';
  if (ext === 'rs' || lang === 'rust') return '🦀';
  if (ext === 'go' || lang === 'go') return '🐹';
  if (['php', 'phtml'].includes(ext) || lang === 'php') return '🐘';
  if (['rb', 'erb', 'rake'].includes(ext) || lang === 'ruby') return '💎';
  if (['kt', 'kts'].includes(ext) || lang === 'kotlin') return '🟣';
  if (ext === 'swift' || lang === 'swift') return '🦅';
  if (ext === 'dart' || lang === 'dart') return '🎯';
  if (['scala', 'sc'].includes(ext) || lang === 'scala') return '🔴';
  if (['r', 'rmd'].includes(ext) || lang === 'r') return '📊';
  if (ext === 'lua' || lang === 'lua') return '🌙';
  if (['pl', 'pm'].includes(ext) || lang === 'perl') return '🐪';
  if (['html', 'htm', 'xhtml', 'vue', 'svelte'].includes(ext) || lang === 'html') return '🌐';
  if (['css', 'scss', 'sass', 'less'].includes(ext) || lang === 'css') return '🎨';
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) return '⚙️';
  if (['xml', 'svg'].includes(ext)) return '📐';
  if (['sh', 'bash', 'zsh', 'ksh'].includes(ext)) return '🖥️';
  if (['ps1', 'psm1', 'psd1'].includes(ext)) return '💻';
  if (['bat', 'cmd'].includes(ext)) return '📜';
  if (['sql', 'pgsql', 'mysql'].includes(ext)) return '🗄️';
  if (['md', 'markdown', 'mdx', 'txt'].includes(ext)) return '📝';
  return '📄';
};

const buildFileTree = (files: Record<string, VirtualFile>, hideCache: boolean = false): Record<string, FileTreeNode> => {
  const root: Record<string, FileTreeNode> = {};

  Object.keys(files).forEach((filePath) => {
    const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const parts = normalized.split('/');

    if (hideCache) {
      if (parts.some((p) => p === '__pycache__' || p === '.git' || p === '.DS_Store' || p.endsWith('.pyc'))) {
        return;
      }
    }

    let currentLevel = root;
    let accumulatedPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (isLast) {
        currentLevel[part] = {
          name: part,
          path: accumulatedPath,
          isFolder: false,
          file: files[filePath],
        };
      } else {
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            path: accumulatedPath,
            isFolder: true,
            children: {},
          };
        }
        currentLevel = currentLevel[part].children!;
      }
    }
  });

  return root;
};

const STARTER_TEMPLATES: Record<string, { name: string; icon: string; files: Record<string, VirtualFile>; engine: 'web' | 'compiler' }> = {
  web: {
    name: 'Modern Web Sandbox (HTML/CSS/JS)',
    icon: '🌐',
    engine: 'web',
    files: {
      'index.html': {
        name: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phantom Sandbox</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <div class="badge">PHANTOM 2.0</div>
    <h1>Interactive Web Sandbox</h1>
    <p>Live reload, zero config, and isolated secure rendering.</p>
    <button id="btn">Click to test interaction</button>
    <div id="output"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      },
      'style.css': {
        name: 'style.css',
        language: 'css',
        content: `* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #09090b; color: #f4f4f5; }
.card { background: #18181b; border: 1px solid #27272a; padding: 32px; border-radius: 20px; text-align: center; max-width: 440px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
.badge { display: inline-block; padding: 4px 12px; background: #27272a; border: 1px solid #3f3f46; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #a1a1aa; margin-bottom: 16px; }
h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #ffffff; }
p { font-size: 14px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.5; }
button { width: 100%; padding: 12px 20px; background: #ffffff; color: #000000; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: transform 0.15s ease, background 0.15s ease; }
button:hover { background: #e4e4e7; transform: scale(1.02); }
button:active { transform: scale(0.98); }
#output { margin-top: 16px; font-size: 13px; color: #38bdf8; font-weight: 600; min-height: 20px; }`,
      },
      'script.js': {
        name: 'script.js',
        language: 'javascript',
        content: `console.log("Phantom Web Sandbox Loaded successfully!");
let count = 0;
const btn = document.getElementById('btn');
const output = document.getElementById('output');

btn.addEventListener('click', () => {
  count++;
  output.textContent = '✨ Button clicked ' + count + ' time' + (count > 1 ? 's' : '') + '!';
  console.log('User interaction logged: Click count =', count);
});`,
      },
    },
  },
  python: {
    name: 'Python 3 Program',
    icon: '🐍',
    engine: 'compiler',
    files: {
      'main.py': {
        name: 'main.py',
        language: 'python',
        content: `# Phantom Multi-Language Sandbox - Python 3
import sys
import time

def fibonacci_series(limit):
    series = [0, 1]
    while len(series) < limit:
        series.append(series[-1] + series[-2])
    return series

def main():
    print("========================================")
    print("   PHANTOM 2.0 PYTHON EXECUTION ENGINE   ")
    print("========================================")
    print(f"Python Version: {sys.version.split()[0]}")
    
    n = 12
    fib = fibonacci_series(n)
    print(f"\\nFirst {n} Fibonacci Numbers:")
    for idx, num in enumerate(fib, 1):
        print(f"  [{idx:02d}] -> {num}")
    
    print("\\n[SUCCESS] Script completed in 0.002s")

if __name__ == '__main__':
    main()
`,
      },
    },
  },
  cpp: {
    name: 'C++ Algorithms & STL',
    icon: '⚡',
    engine: 'compiler',
    files: {
      'main.cpp': {
        name: 'main.cpp',
        language: 'cpp',
        content: `// Phantom Multi-Language Sandbox - C++ STL
#include <iostream>
#include <vector>
#include <numeric>
#include <algorithm>

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "      PHANTOM C++ EXECUTION ENGINE      " << std::endl;
    std::cout << "========================================" << std::endl;
    
    std::vector<int> numbers = {45, 12, 85, 32, 89, 39, 69, 44, 42, 1, 99};
    std::cout << "Original vector: ";
    for (int n : numbers) std::cout << n << " ";
    std::cout << std::endl;

    std::sort(numbers.begin(), numbers.end());
    std::cout << "Sorted vector:   ";
    for (int n : numbers) std::cout << n << " ";
    std::cout << std::endl;

    int sum = std::accumulate(numbers.begin(), numbers.end(), 0);
    std::cout << "Sum of elements: " << sum << std::endl;
    std::cout << "Max element:     " << numbers.back() << std::endl;

    return 0;
}
`,
      },
    },
  },
  typescript: {
    name: 'TypeScript Clean Architecture',
    icon: '🔷',
    engine: 'compiler',
    files: {
      'index.ts': {
        name: 'index.ts',
        language: 'typescript',
        content: `// Phantom TypeScript Environment
interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

class TaskManager {
  private tasks: Task[] = [];

  addTask(title: string, priority: Task['priority'] = 'medium'): Task {
    const task: Task = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      completed: false,
      priority,
    };
    this.tasks.push(task);
    return task;
  }

  listTasks(): Task[] {
    return this.tasks;
  }
}

const manager = new TaskManager();
manager.addTask('Build Next.js Frontend', 'high');
manager.addTask('Configure PostgreSQL Database', 'high');
manager.addTask('Implement Real-time IDE MVP', 'high');

console.log("=== Active Tasks ===");
console.log(JSON.stringify(manager.listTasks(), null, 2));
`,
      },
    },
  },
  rust: {
    name: 'Rust Systems Project',
    icon: '🦀',
    engine: 'compiler',
    files: {
      'main.rs': {
        name: 'main.rs',
        language: 'rust',
        content: `// Phantom Multi-Language Sandbox - Rust
fn is_prime(n: u64) -> bool {
    if n <= 1 { return false; }
    if n <= 3 { return true; }
    if n % 2 == 0 || n % 3 == 0 { return false; }
    let mut i = 5;
    while i * i <= n {
        if n % i == 0 || n % (i + 2) == 0 { return false; }
        i += 6;
    }
    true
}

fn main() {
    println!("========================================");
    println!("       PHANTOM RUST ENGINE V2.0         ");
    println!("========================================");
    
    let limit = 50;
    println!("Primes up to {}:", limit);
    for n in 1..=limit {
        if is_prime(n) {
            print!("{} ", n);
        }
    }
    println!("\\n[OK] Execution completed.");
}
`,
      },
    },
  },
  go: {
    name: 'Go Concurrency Service',
    icon: '🐹',
    engine: 'compiler',
    files: {
      'main.go': {
        name: 'main.go',
        language: 'go',
        content: `// Phantom Multi-Language Sandbox - Go
package main

import (
	"fmt"
	"time"
)

func worker(id int, jobs <-chan int, results chan<- int) {
	for j := range jobs {
		time.Sleep(5 * time.Millisecond)
		results <- j * 2
	}
}

func main() {
	fmt.Println("========================================")
	fmt.Println("       PHANTOM GO WORKER POOL           ")
	fmt.Println("========================================")

	const numJobs = 5
	jobs := make(chan int, numJobs)
	results := make(chan int, numJobs)

	for w := 1; w <= 3; w++ {
		go worker(w, jobs, results)
	}

	for j := 1; j <= numJobs; j++ {
		jobs <- j
	}
	close(jobs)

	for a := 1; a <= numJobs; a++ {
		res := <-results
		fmt.Printf("Job result received: %d\\n", res)
	}

	fmt.Println("[OK] All Go goroutines finished.")
}
`,
      },
    },
  },
  java: {
    name: 'Java 17 OOP Application',
    icon: '☕',
    engine: 'compiler',
    files: {
      'Main.java': {
        name: 'Main.java',
        language: 'java',
        content: `// Phantom Multi-Language Sandbox - Java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("========================================");
        System.out.println("       PHANTOM 2.0 JAVA ENGINE          ");
        System.out.println("========================================");
        
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter your name: ");
        if (scanner.hasNextLine()) {
            String name = scanner.nextLine();
            System.out.println("Hello, " + name + "! Welcome to Phantom AI IDE.");
        } else {
            System.out.println("[SUCCESS] Java program compiled and executed cleanly.");
        }
    }
}
`,
      },
    },
  },
  javascript: {
    name: 'Node.js Backend Script',
    icon: '🟨',
    engine: 'compiler',
    files: {
      'script.js': {
        name: 'script.js',
        language: 'javascript',
        content: `// Phantom Node.js Environment
console.log("========================================");
console.log("      PHANTOM 2.0 NODE.JS RUNTIME       ");
console.log("========================================");
console.log("Node.js Version:", process.version);
const data = [12, 45, 68, 23, 89, 90];
const total = data.reduce((a, b) => a + b, 0);
console.log("Array elements:", data);
console.log("Sum:", total);
console.log("Average:", (total / data.length).toFixed(2));
`,
      },
    },
  },
};

interface ShortcutItem {
  id: string;
  category: 'execution' | 'editor' | 'navigation';
  keys: string[];
  macKeys?: string[];
  title: string;
  description: string;
  badge?: string;
  actionType?: 'run' | 'save' | 'find' | 'sidebar' | 'terminal' | 'ai' | 'comment';
}

const IDE_SHORTCUTS: ShortcutItem[] = [
  // Execution & Terminal
  {
    id: 'run-code',
    category: 'execution',
    keys: ['Ctrl', 'Enter'],
    macKeys: ['⌘', 'Enter'],
    title: 'Run / Live Preview',
    description: 'Execute active file or reload web preview in real-time',
    badge: 'Runner',
    actionType: 'run',
  },
  {
    id: 'term-exec',
    category: 'execution',
    keys: ['Enter'],
    title: 'Run Terminal Command',
    description: 'Submit command in active interactive terminal session',
    badge: 'Terminal',
  },
  {
    id: 'term-history',
    category: 'execution',
    keys: ['↑', '↓'],
    title: 'Command History',
    description: 'Cycle through previously executed terminal commands',
    badge: 'Terminal',
  },
  {
    id: 'term-kill',
    category: 'execution',
    keys: ['Ctrl', 'C'],
    macKeys: ['⌘', 'C'],
    title: 'Terminate Process',
    description: 'Send SIGINT / kill currently running terminal execution',
    badge: 'Terminal',
  },
  {
    id: 'term-toggle',
    category: 'execution',
    keys: ['Ctrl', '`'],
    macKeys: ['⌘', '`'],
    title: 'Toggle Terminal Drawer',
    description: 'Expand or collapse the bottom terminal and output drawer',
    badge: 'Panel',
    actionType: 'terminal',
  },

  // Editor & Language Smart Typing
  {
    id: 'toggle-comment',
    category: 'editor',
    keys: ['Ctrl', '/'],
    macKeys: ['⌘', '/'],
    title: 'Toggle Line Comment',
    description: 'Comment/uncomment selection with auto-detected syntax (#, //, <!-- -->, /* */, --, REM)',
    badge: 'Syntax',
    actionType: 'comment',
  },
  {
    id: 'duplicate-line',
    category: 'editor',
    keys: ['Ctrl', 'D'],
    macKeys: ['⌘', 'D'],
    title: 'Duplicate Line / Block',
    description: 'Duplicate the active line or highlighted code selection below',
    badge: 'Edit',
  },
  {
    id: 'move-line-up-down',
    category: 'editor',
    keys: ['Alt', '↑ / ↓'],
    macKeys: ['⌥', '↑ / ↓'],
    title: 'Move Line Up / Down',
    description: 'Swap current line or block with the preceding or following line',
    badge: 'Edit',
  },
  {
    id: 'delete-line',
    category: 'editor',
    keys: ['Ctrl', 'Shift', 'K'],
    macKeys: ['⌘', 'Shift', 'K'],
    title: 'Delete Line',
    description: 'Instantly remove the current cursor line from the document',
    badge: 'Edit',
  },
  {
    id: 'indent-block',
    category: 'editor',
    keys: ['Tab'],
    title: 'Smart Indentation',
    description: 'Indent line or selection (auto 2 or 4 spaces based on language)',
    badge: 'Indent',
  },
  {
    id: 'dedent-block',
    category: 'editor',
    keys: ['Shift', 'Tab'],
    title: 'Dedent / Outdent',
    description: 'Remove indentation level from line or selected lines',
    badge: 'Indent',
  },
  {
    id: 'auto-indent-enter',
    category: 'editor',
    keys: ['Enter'],
    title: 'Smart Auto-Indent & Split',
    description: 'Retain indentation and expand split braces ({}, [], ()) with nested levels',
    badge: 'Format',
  },
  {
    id: 'auto-close-pairs',
    category: 'editor',
    keys: ['(', '[', '{', '"', "'", '`'],
    title: 'Auto-Close Pairs & Wrap',
    description: 'Insert closing bracket/quote or wrap selected text with delimiters',
    badge: 'Pairs',
  },
  {
    id: 'smart-backspace',
    category: 'editor',
    keys: ['Backspace'],
    title: 'Smart Backspace',
    description: 'Delete entire soft-tab width and auto-delete matching bracket pairs',
    badge: 'Smart',
  },

  // Navigation & Workspace
  {
    id: 'save-project',
    category: 'navigation',
    keys: ['Ctrl', 'S'],
    macKeys: ['⌘', 'S'],
    title: 'Save to Cloud',
    description: 'Persist project and virtual files to PostgreSQL cloud storage',
    badge: 'Cloud',
    actionType: 'save',
  },
  {
    id: 'find-replace',
    category: 'navigation',
    keys: ['Ctrl', 'F'],
    macKeys: ['⌘', 'F'],
    title: 'Find & Replace',
    description: 'Search and batch-replace text within the active document',
    badge: 'Search',
    actionType: 'find',
  },
  {
    id: 'toggle-sidebar',
    category: 'navigation',
    keys: ['Ctrl', 'B'],
    macKeys: ['⌘', 'B'],
    title: 'Toggle File Explorer',
    description: 'Show or hide the left workspace files and folders sidebar',
    badge: 'Workspace',
    actionType: 'sidebar',
  },
  {
    id: 'toggle-ai',
    category: 'navigation',
    keys: ['Ctrl', 'K'],
    macKeys: ['⌘', 'K'],
    title: 'Toggle AI Suite',
    description: 'Open Phantom AI Coding Assistant for fixes, explanations, and tests',
    badge: 'AI',
    actionType: 'ai',
  },
  {
    id: 'open-shortcuts',
    category: 'navigation',
    keys: ['F1'],
    macKeys: ['F1', '⌘+Shift+P'],
    title: 'Shortcuts Reference',
    description: 'Open this interactive Keyboard Shortcuts Cheat Sheet modal',
    badge: 'Help',
  },
  {
    id: 'escape-modals',
    category: 'navigation',
    keys: ['Escape'],
    title: 'Close / Dismiss',
    description: 'Close open dialogs, menus, overlays, and search bars',
    badge: 'System',
  },
];

export const DevStudio: React.FC<DevStudioProps> = ({
  initialCode,
  initialLanguage = 'html',
  onBackToChat,
  isAuthenticated = false,
  userProfile,
  onOpenAuth,
}) => {
  // --- Core State & Cloud Persistence ---
  const [currentTemplate, setCurrentTemplate] = useState<string>('web');
  const [activeEngine, setActiveEngine] = useState<'web' | 'compiler'>('web');
  const [files, setFiles] = useState<Record<string, VirtualFile>>(STARTER_TEMPLATES.web.files);
  const [openTabs, setOpenTabs] = useState<string[]>(['index.html', 'style.css', 'script.js']);
  const [activeFilename, setActiveFilename] = useState<string>('index.html');
  const [projectName, setProjectName] = useState<string>('Untitled Project');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'unsaved' | 'local'>('synced');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [sessionToast, setSessionToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    message: '',
    type: 'info',
  });

  // --- Output & Execution State ---
  const [bottomTab, setBottomTab] = useState<'preview' | 'terminal' | 'console'>('preview');
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [srcDoc, setSrcDoc] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionOutput, setExecutionOutput] = useState<{ stdout?: string; stderr?: string; error?: string; execution_time?: string; exit_code?: number } | null>(null);

  // --- Multi-Tab Interactive Terminal State ---
  const [terminalTabs, setTerminalTabs] = useState<TerminalTab[]>([
    {
      id: 'term-1',
      name: 'Terminal 1',
      entries: [
        {
          id: 'init-1',
          type: 'system',
          text: 'Phantom AI IDE Terminal & Multi-Language Compiler [v2.0]\nType commands (e.g. python app.py, javac Main.java, java Main, dir, ls) or use "Ask Phantom" for natural language.',
        },
      ],
      history: [],
      historyIndex: -1,
      isExecuting: false,
      currentInput: '',
      cwd: 'C:\\PhantomAI\\workspace',
    },
  ]);
  const [activeTerminalTabId, setActiveTerminalTabId] = useState<string>('term-1');
  const [askPhantomInput, setAskPhantomInput] = useState<string>('');
  const [askPhantomLoading, setAskPhantomLoading] = useState<boolean>(false);
  const [terminalFontSize, setTerminalFontSize] = useState<number>(12);
  const [terminalWordWrap, setTerminalWordWrap] = useState<boolean>(true);
  const [showTerminalSettings, setShowTerminalSettings] = useState<boolean>(false);

  // Destructive command safety confirmation modal state
  const [destructiveModal, setDestructiveModal] = useState<{
    open: boolean;
    command: string;
    warning: string;
    tabId: string;
  }>({
    open: false,
    command: '',
    warning: '',
    tabId: 'term-1',
  });

  // Active Ports modal / popover state
  const [portsModalOpen, setPortsModalOpen] = useState<boolean>(false);
  const [activePorts, setActivePorts] = useState<PortStatus[]>([]);
  const [portsLoading, setPortsLoading] = useState<boolean>(false);

  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  const activeTerminalTab = useMemo(() => {
    return terminalTabs.find((t) => t.id === activeTerminalTabId) || terminalTabs[0] || {
      id: 'term-1',
      name: 'Terminal 1',
      entries: [],
      history: [],
      historyIndex: -1,
      isExecuting: false,
      currentInput: '',
      cwd: 'C:\\PhantomAI\\workspace',
    };
  }, [terminalTabs, activeTerminalTabId]);

  // --- Find & Replace & Shortcuts Modal State ---
  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [shortcutFilter, setShortcutFilter] = useState<string>('');
  const [shortcutCategory, setShortcutCategory] = useState<'all' | 'execution' | 'editor' | 'navigation'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<number>(0);

  // --- AI Assistant State ---
  const [aiOpen, setAiOpen] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<AIActionResponse | null>(null);
  const [aiActiveAction, setAiActiveAction] = useState<string | null>(null);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [aiChatInput, setAiChatInput] = useState<string>('');

  // --- Projects Modal State ---
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [loadModalOpen, setLoadModalOpen] = useState<boolean>(false);
  const [savedProjectsList, setSavedProjectsList] = useState<ProjectRecord[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [projectLoadingState, setProjectLoadingState] = useState<{
    isLoading: boolean;
    message: string;
    progress: number;
  }>({ isLoading: false, message: '', progress: 0 });

  // --- Modals and Tree State for File/Folder Ops ---
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [hideCacheFiles, setHideCacheFiles] = useState<boolean>(false);
  const [newItemModal, setNewItemModal] = useState<{ open: boolean; isFolder: boolean; parentFolder?: string }>({ open: false, isFolder: false });
  const [newFileNameInput, setNewFileNameInput] = useState<string>('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');

  // --- Resizable Window Panels State ---
  const [sidebarWidth, setSidebarWidth] = useState<number>(240);
  const [outputWidth, setOutputWidth] = useState<number>(480);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);
  const [isDraggingOutput, setIsDraggingOutput] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState<boolean>(false);

  // Load saved panel widths from localStorage
  useEffect(() => {
    try {
      const savedSidebar = localStorage.getItem('phantom_ide_sidebar_width');
      if (savedSidebar) {
        const val = parseInt(savedSidebar, 10);
        if (!isNaN(val) && val >= 140 && val <= 500) setSidebarWidth(val);
      }
      const savedOutput = localStorage.getItem('phantom_ide_output_width');
      if (savedOutput) {
        const val = parseInt(savedOutput, 10);
        if (!isNaN(val) && val >= 250 && val <= 1000) setOutputWidth(val);
      }
    } catch {}
  }, []);

  // Dragging handler for Left File Explorer Panel
  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    let latestWidth = startWidth;

    const MIN_SIDEBAR = 160;
    const MIN_EDITOR = 300;
    const currentOutput = isOutputCollapsed ? 0 : outputWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const maxAllowed = Math.max(MIN_SIDEBAR, Math.min(450, window.innerWidth - currentOutput - MIN_EDITOR));
      const newWidth = Math.max(MIN_SIDEBAR, Math.min(maxAllowed, startWidth + deltaX));
      latestWidth = newWidth;
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDraggingSidebar(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem('phantom_ide_sidebar_width', String(latestWidth));
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth, outputWidth, isOutputCollapsed]);

  // Dragging handler for Right Output Drawer Panel
  const handleOutputMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingOutput(true);
    const startX = e.clientX;
    const startWidth = outputWidth;
    let latestWidth = startWidth;

    const MIN_OUTPUT = 260;
    const MIN_EDITOR = 300;
    const currentSidebar = isSidebarCollapsed ? 0 : sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Dragging left increases drawer width, dragging right decreases it
      const deltaX = startX - moveEvent.clientX;
      const maxAllowed = Math.max(MIN_OUTPUT, Math.min(Math.floor(window.innerWidth * 0.72), window.innerWidth - currentSidebar - MIN_EDITOR));
      const newWidth = Math.max(MIN_OUTPUT, Math.min(maxAllowed, startWidth + deltaX));
      latestWidth = newWidth;
      setOutputWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDraggingOutput(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem('phantom_ide_output_width', String(latestWidth));
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [outputWidth, sidebarWidth, isSidebarCollapsed]);

  // Dynamic window resize clamping so internal panels and editor never get hidden or squashed
  useEffect(() => {
    const handleWindowResize = () => {
      const winWidth = window.innerWidth;
      const MIN_SIDEBAR = 160;
      const MIN_OUTPUT = 260;
      const MIN_EDITOR = 300;

      setSidebarWidth((prevSidebar) => {
        const currentOutput = isOutputCollapsed ? 0 : outputWidth;
        const maxAllowed = Math.max(MIN_SIDEBAR, Math.min(450, winWidth - currentOutput - MIN_EDITOR));
        return Math.min(prevSidebar, maxAllowed);
      });

      setOutputWidth((prevOutput) => {
        const currentSidebar = isSidebarCollapsed ? 0 : sidebarWidth;
        const maxAllowed = Math.max(MIN_OUTPUT, Math.min(Math.floor(winWidth * 0.72), winWidth - currentSidebar - MIN_EDITOR));
        return Math.min(prevOutput, maxAllowed);
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [sidebarWidth, outputWidth, isSidebarCollapsed, isOutputCollapsed]);

  // --- Refs ---
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  // --- Initialization with Initial Code ---
  useEffect(() => {
    if (initialCode) {
      const ext = initialLanguage === 'python' ? 'py' : initialLanguage === 'javascript' ? 'js' : initialLanguage === 'typescript' ? 'ts' : initialLanguage === 'cpp' ? 'cpp' : 'html';
      const filename = `main.${ext}`;
      const newFiles: Record<string, VirtualFile> = {
        [filename]: {
          name: filename,
          language: getLanguageForFilename(filename),
          content: initialCode,
        },
      };
      setFiles(newFiles);
      setOpenTabs([filename]);
      setActiveFilename(filename);
      setActiveEngine(ext === 'html' ? 'web' : 'compiler');
      setBottomTab(ext === 'html' ? 'preview' : 'terminal');
    }
  }, [initialCode, initialLanguage]);

  // --- Debounced Real-time Web Sandbox Compilation ---
  useEffect(() => {
    if (activeEngine === 'web') {
      const timer = setTimeout(() => {
        const htmlFile = files['index.html']?.content || '';
        const cssFile = files['style.css']?.content || '';
        const jsFile = files['script.js']?.content || '';

        // Intercept iframe console logs and postMessage to parent
        const injectedConsoleScript = `
          <script>
            (function() {
              const originalLog = console.log;
              const originalWarn = console.warn;
              const originalError = console.error;
              function send(level, args) {
                try {
                  window.parent.postMessage({
                    type: 'SANDBOX_CONSOLE',
                    level: level,
                    message: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
                  }, '*');
                } catch(e) {}
              }
              console.log = function() { originalLog.apply(console, arguments); send('log', arguments); };
              console.warn = function() { originalWarn.apply(console, arguments); send('warn', arguments); };
              console.error = function() { originalError.apply(console, arguments); send('error', arguments); };
            })();
          </script>
        `;

        let combined = htmlFile;
        if (!combined.includes('<style>') && cssFile) {
          combined = combined.replace('</head>', `<style>\n${cssFile}\n</style></head>`);
        }
        if (!combined.includes('<script>') && jsFile) {
          combined = combined.replace('</body>', `${injectedConsoleScript}<script>\n${jsFile}\n</script></body>`);
        } else {
          combined = combined.replace('</head>', `${injectedConsoleScript}</head>`);
        }

        setSrcDoc(combined);
      }, 250);

      return () => clearTimeout(timer);
    }
  }, [files['index.html']?.content, files['style.css']?.content, files['script.js']?.content, activeEngine]);

  // --- Listen to Iframe Console Logs ---
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SANDBOX_CONSOLE') {
        const newLog: ConsoleLog = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          level: e.data.level,
          message: e.data.message,
        };
        setConsoleLogs((prev) => [...prev.slice(-100), newLog]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auto-scroll AI Assistant chat to bottom on new messages or actions
  useEffect(() => {
    if (aiOpen) {
      aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatMessages, aiResponse, aiOpen]);

  // --- Global Keyboard Shortcuts (Ctrl+S, Ctrl+Enter, Ctrl+F, Ctrl+B, Ctrl+`, Ctrl+K, F1, Escape) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save Project: Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSaveModalOpen(true);
      }
      // Run Code: Ctrl+Enter / Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
      // Find & Replace: Ctrl+F / Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFindReplace((prev) => !prev);
      }
      // Toggle File Explorer Sidebar: Ctrl+B / Cmd+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
      // Toggle Output / Terminal Drawer: Ctrl+` or Ctrl+~
      if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        setIsOutputCollapsed((prev) => !prev);
      }
      // Toggle Phantom AI Assistant: Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAiOpen((prev) => !prev);
      }
      // Open Keyboard Shortcuts Cheat Sheet: F1 or Shift+? (when not in input)
      if (e.key === 'F1' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      }
      // Close Modals on Escape
      if (e.key === 'Escape') {
        if (shortcutsModalOpen) setShortcutsModalOpen(false);
        if (aiOpen) setAiOpen(false);
        if (showFindReplace) setShowFindReplace(false);
        if (saveModalOpen) setSaveModalOpen(false);
        if (loadModalOpen) setLoadModalOpen(false);
        if (newItemModal.open) setNewItemModal({ open: false, isFolder: false });
        if (destructiveModal.open) setDestructiveModal({ open: false, command: '', warning: '', tabId: 'term-1' });
        if (portsModalOpen) setPortsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, activeEngine, activeFilename, aiOpen, showFindReplace, shortcutsModalOpen, saveModalOpen, loadModalOpen, newItemModal.open, destructiveModal.open, portsModalOpen]);

  // --- Multi-Tab Terminal Tab Management ---
  const handleNewTerminalTab = (name?: string) => {
    const newId = `term-${Date.now()}`;
    const newTab: TerminalTab = {
      id: newId,
      name: name || `Terminal ${terminalTabs.length + 1}`,
      entries: [
        {
          id: `init-${Date.now()}`,
          type: 'system',
          text: `Phantom AI Terminal [${name || `Terminal ${terminalTabs.length + 1}`}] Session Started.\nType commands (e.g. python app.py, javac Main.java, java Main, dir, ls) or use "Ask Phantom".`,
        },
      ],
      history: [],
      historyIndex: -1,
      isExecuting: false,
      currentInput: '',
      cwd: 'C:\\PhantomAI\\workspace',
    };
    setTerminalTabs((prev) => [...prev, newTab]);
    setActiveTerminalTabId(newId);
    setBottomTab('terminal');
  };

  const handleCloseTerminalTab = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (terminalTabs.length <= 1) {
      handleClearTerminal(tabId);
      return;
    }
    const remaining = terminalTabs.filter((t) => t.id !== tabId);
    setTerminalTabs(remaining);
    if (activeTerminalTabId === tabId) {
      setActiveTerminalTabId(remaining[remaining.length - 1].id);
    }
  };

  const handleRenameTerminalTab = (tabId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setTerminalTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, name: trimmed } : t))
    );
  };

  const handleClearTerminal = (tabId?: string) => {
    const targetId = tabId || activeTerminalTabId;
    setTerminalTabs((prev) =>
      prev.map((t) => (t.id === targetId ? { ...t, entries: [], currentInput: '', historyIndex: -1 } : t))
    );
    setExecutionOutput(null);
  };

  const handleKillTerminalProcess = async (tabId?: string) => {
    const targetId = tabId || activeTerminalTabId;
    try {
      await api.terminalKill(targetId);
      await api.stopCode();
    } catch {
      // Ignore network errors on kill
    }
    setTerminalTabs((prev) =>
      prev.map((t) => {
        if (t.id === targetId) {
          return {
            ...t,
            isExecuting: false,
            entries: [
              ...t.entries,
              {
                id: Math.random().toString(36).substring(2, 9),
                type: 'stderr',
                text: '[PROCESS TERMINATED BY USER / SIGINT]',
                exitCode: 130,
              },
            ],
          };
        }
        return t;
      })
    );
    setIsExecuting(false);
  };

  const handleFetchPorts = async () => {
    setPortsLoading(true);
    try {
      const res = await api.getTerminalPorts();
      setActivePorts(res.ports || []);
    } catch {
      setActivePorts([]);
    } finally {
      setPortsLoading(false);
    }
  };

  // --- Multi-Tab Terminal Command Execution ---
  const handleExecuteTerminalCommand = async (
    cmdStr?: string,
    stdinOverride?: string,
    tabId?: string,
    confirmed = false
  ) => {
    const targetId = tabId || activeTerminalTabId;
    const currentTab = terminalTabs.find((t) => t.id === targetId) || activeTerminalTab;
    const rawInput = (cmdStr !== undefined ? cmdStr : currentTab.currentInput).trim();
    if (!rawInput) return;

    if (rawInput === 'clear' || rawInput === 'cls') {
      handleClearTerminal(targetId);
      return;
    }

    // Add command entry to history & stream
    setTerminalTabs((prev) =>
      prev.map((t) => {
        if (t.id === targetId) {
          const cmdEntry: TerminalEntry = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'command',
            text: `$ ${rawInput}`,
            timestamp: new Date().toLocaleTimeString(),
            command: rawInput,
          };
          return {
            ...t,
            currentInput: '',
            history: [rawInput, ...t.history.filter((c) => c !== rawInput)],
            historyIndex: -1,
            isExecuting: true,
            entries: [...t.entries, cmdEntry],
          };
        }
        return t;
      })
    );

    setIsExecuting(true);
    setBottomTab('terminal');

    const filesPayload: Record<string, string> = {};
    Object.values(files).forEach((f) => {
      filesPayload[f.name] = f.content;
    });

    try {
      const res = await api.terminalExec(rawInput, filesPayload, stdinOverride || undefined, targetId, confirmed);

      if (res.clear) {
        handleClearTerminal(targetId);
        return;
      }

      // Security check: Destructive command confirmation required
      if (res.requires_confirmation) {
        setDestructiveModal({
          open: true,
          command: rawInput,
          warning: res.warning || 'Potentially destructive command detected.',
          tabId: targetId,
        });
        setTerminalTabs((prev) =>
          prev.map((t) => (t.id === targetId ? { ...t, isExecuting: false } : t))
        );
        setIsExecuting(false);
        return;
      }

      const newEntries: TerminalEntry[] = [];
      if (res.stdout) {
        newEntries.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'stdout',
          text: res.stdout,
        });
      }
      if (res.stderr) {
        newEntries.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'stderr',
          text: res.stderr,
          exitCode: res.exit_code,
          command: rawInput,
        });
      }
      if (!res.stdout && !res.stderr && res.exit_code === 0) {
        newEntries.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'stdout',
          text: `[Command completed successfully (Exit code: 0)]`,
        });
      }

      // Sync any files created or modified by terminal command into workspace state
      if (res.modified_files && typeof res.modified_files === 'object') {
        setFiles((prevFiles) => {
          const updated = { ...prevFiles };
          let hasChanges = false;
          Object.entries(res.modified_files as Record<string, string>).forEach(([fname, fcontent]) => {
            if (!updated[fname] || updated[fname].content !== fcontent) {
              updated[fname] = {
                name: fname,
                language: getLanguageForFilename(fname),
                content: fcontent,
              };
              hasChanges = true;
            }
          });
          return hasChanges ? updated : prevFiles;
        });
      }

      setTerminalTabs((prev) =>
        prev.map((t) => {
          if (t.id === targetId) {
            return {
              ...t,
              isExecuting: false,
              entries: [...t.entries, ...newEntries],
            };
          }
          return t;
        })
      );
      setExecutionOutput(res);
    } catch (err: any) {
      setTerminalTabs((prev) =>
        prev.map((t) => {
          if (t.id === targetId) {
            return {
              ...t,
              isExecuting: false,
              entries: [
                ...t.entries,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  type: 'stderr',
                  text: err.message || 'Execution error.',
                  exitCode: 1,
                  command: rawInput,
                },
              ],
            };
          }
          return t;
        })
      );
    } finally {
      setIsExecuting(false);
      setTimeout(() => {
        terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        terminalInputRef.current?.focus();
      }, 50);
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteTerminalCommand();
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentTab = activeTerminalTab;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentTab.history.length === 0) return;
      const nextIdx = Math.min(currentTab.history.length - 1, currentTab.historyIndex + 1);
      setTerminalTabs((prev) =>
        prev.map((t) =>
          t.id === currentTab.id
            ? { ...t, historyIndex: nextIdx, currentInput: currentTab.history[nextIdx] || '' }
            : t
        )
      );
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentTab.historyIndex <= 0) {
        setTerminalTabs((prev) =>
          prev.map((t) =>
            t.id === currentTab.id
              ? { ...t, historyIndex: -1, currentInput: '' }
              : t
          )
        );
      } else {
        const nextIdx = currentTab.historyIndex - 1;
        setTerminalTabs((prev) =>
          prev.map((t) =>
            t.id === currentTab.id
              ? { ...t, historyIndex: nextIdx, currentInput: currentTab.history[nextIdx] || '' }
              : t
          )
        );
      }
    }
  };

  // --- AI Terminal Intelligence Actions ---
  const handleAskPhantomSubmit = async (promptText?: string) => {
    const query = (promptText || askPhantomInput).trim();
    if (!query || askPhantomLoading) return;
    setAskPhantomLoading(true);
    setAskPhantomInput('');

    const targetId = activeTerminalTabId;
    try {
      const res = await api.terminalAIAssist({
        action: 'natural_command',
        query,
        files: Object.keys(files),
      });

      if (res.result?.command) {
        const suggestionEntry: TerminalEntry = {
          id: Math.random().toString(36).substring(2, 9),
          type: 'ai-suggestion',
          text: `✨ Phantom Suggestion: ${res.result.explanation || ''}`,
          command: res.result.command,
          explanation: res.result.explanation,
        };

        setTerminalTabs((prev) =>
          prev.map((t) => (t.id === targetId ? { ...t, entries: [...t.entries, suggestionEntry] } : t))
        );
      }
    } catch (e: any) {
      const errEntry: TerminalEntry = {
        id: Math.random().toString(36).substring(2, 9),
        type: 'stderr',
        text: `[Phantom AI Assistant Error]: ${e.message || 'Failed to generate command.'}`,
      };
      setTerminalTabs((prev) =>
        prev.map((t) => (t.id === targetId ? { ...t, entries: [...t.entries, errEntry] } : t))
      );
    } finally {
      setAskPhantomLoading(false);
      setTimeout(() => {
        terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleDiagnoseTerminalError = async (entry: TerminalEntry) => {
    if (!entry.text) return;
    const targetId = activeTerminalTabId;
    setTerminalTabs((prev) =>
      prev.map((t) => {
        if (t.id === targetId) {
          const diagnosingEntry: TerminalEntry = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'system',
            text: '✨ Analyzing failure with Phantom AI Intelligence Engine...',
          };
          return { ...t, entries: [...t.entries, diagnosingEntry] };
        }
        return t;
      })
    );

    try {
      const res = await api.terminalAIAssist({
        action: 'explain_error',
        command: entry.command,
        stderr: entry.text,
        exit_code: entry.exitCode,
        files: Object.keys(files),
      });

      if (res.result) {
        const fixEntry: TerminalEntry = {
          id: Math.random().toString(36).substring(2, 9),
          type: 'ai-fix',
          text: res.result.explanation || 'Analyzed error diagnosis.',
          explanation: res.result.root_cause,
          fixCommand: res.result.command || res.result.suggested_fix,
        };

        setTerminalTabs((prev) =>
          prev.map((t) => (t.id === targetId ? { ...t, entries: [...t.entries, fixEntry] } : t))
        );
      }
    } catch (e: any) {
      const errEntry: TerminalEntry = {
        id: Math.random().toString(36).substring(2, 9),
        type: 'stderr',
        text: `[Phantom Diagnosis Error]: ${e.message || 'Could not analyze error.'}`,
      };
      setTerminalTabs((prev) =>
        prev.map((t) => (t.id === targetId ? { ...t, entries: [...t.entries, errEntry] } : t))
      );
    } finally {
      setTimeout(() => {
        terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  // --- Code Execution Handler (Dynamically driven by active file extension) ---
  const handleRunCode = async () => {
    const config = getRunConfigForFile(activeFilename, Boolean(files['index.html']));

    if (config.engine === 'web') {
      setPreviewKey((k) => k + 1);
      setBottomTab('preview');
      return;
    }

    setBottomTab('terminal');
    const activeFile = files[activeFilename] || Object.values(files)[0];
    if (!activeFile) return;

    let cmdToRun = `python ${activeFile.name}`;
    const ext = (activeFile.name || '').split('.').pop()?.toLowerCase() || '';

    if (['java'].includes(activeFile.language) || ext === 'java') {
      const className = activeFile.name.replace(/\.[^/.]+$/, '');
      cmdToRun = `javac ${activeFile.name} && java ${className}`;
    } else if (['cpp', 'c++'].includes(activeFile.language) || ['cpp', 'cc', 'cxx', 'c++'].includes(ext)) {
      cmdToRun = `g++ ${activeFile.name} -o main.exe && main.exe`;
    } else if (['c'].includes(activeFile.language) || ext === 'c') {
      cmdToRun = `gcc ${activeFile.name} -o main.exe && main.exe`;
    } else if (['csharp', 'cs'].includes(activeFile.language) || ['cs', 'csx'].includes(ext)) {
      cmdToRun = `csc ${activeFile.name} && main.exe`;
    } else if (['javascript', 'js'].includes(activeFile.language) || ['js', 'mjs', 'cjs', 'jsx'].includes(ext)) {
      cmdToRun = `node ${activeFile.name}`;
    } else if (['typescript', 'ts'].includes(activeFile.language) || ['ts', 'tsx', 'mts', 'cts'].includes(ext)) {
      cmdToRun = `node ${activeFile.name}`;
    } else if (['rust', 'rs'].includes(activeFile.language) || ext === 'rs') {
      cmdToRun = `rustc ${activeFile.name} -o main.exe && main.exe`;
    } else if (['go'].includes(activeFile.language) || ext === 'go') {
      cmdToRun = `go run ${activeFile.name}`;
    } else if (['php'].includes(activeFile.language) || ['php', 'phtml'].includes(ext)) {
      cmdToRun = `php ${activeFile.name}`;
    } else if (['ruby', 'rb'].includes(activeFile.language) || ['rb', 'rake'].includes(ext)) {
      cmdToRun = `ruby ${activeFile.name}`;
    } else if (['kotlin', 'kt'].includes(activeFile.language) || ['kt', 'kts'].includes(ext)) {
      cmdToRun = `kotlinc ${activeFile.name} -include-runtime -d main.jar && java -jar main.jar`;
    } else if (['swift'].includes(activeFile.language) || ext === 'swift') {
      cmdToRun = `swift ${activeFile.name}`;
    } else if (['dart'].includes(activeFile.language) || ext === 'dart') {
      cmdToRun = `dart run ${activeFile.name}`;
    } else if (['scala'].includes(activeFile.language) || ext === 'scala') {
      cmdToRun = `scala ${activeFile.name}`;
    } else if (['r'].includes(activeFile.language) || ext === 'r') {
      cmdToRun = `Rscript ${activeFile.name}`;
    } else if (['lua'].includes(activeFile.language) || ext === 'lua') {
      cmdToRun = `lua ${activeFile.name}`;
    } else if (['perl', 'pl'].includes(activeFile.language) || ['pl', 'pm'].includes(ext)) {
      cmdToRun = `perl ${activeFile.name}`;
    } else if (['bash', 'sh'].includes(activeFile.language) || ['sh', 'bash', 'zsh'].includes(ext)) {
      cmdToRun = `bash ${activeFile.name}`;
    } else if (['powershell', 'ps1'].includes(activeFile.language) || ['ps1', 'psm1'].includes(ext)) {
      cmdToRun = `powershell -ExecutionPolicy Bypass -File ${activeFile.name}`;
    } else if (['batch', 'bat'].includes(activeFile.language) || ['bat', 'cmd'].includes(ext)) {
      cmdToRun = `cmd.exe /c ${activeFile.name}`;
    } else if (['python', 'py'].includes(activeFile.language) || ['py', 'pyw', 'rpy'].includes(ext)) {
      cmdToRun = `python ${activeFile.name}`;
    }

    await handleExecuteTerminalCommand(cmdToRun);
  };

  const handleStopCode = async () => {
    await handleKillTerminalProcess();
  };

  // --- Template Switcher ---
  const handleSelectTemplate = (templateKey: string) => {
    const template = STARTER_TEMPLATES[templateKey];
    if (!template) return;
    setCurrentTemplate(templateKey);
    setFiles(template.files);
    const filenames = Object.keys(template.files);
    setOpenTabs(filenames);
    setActiveFilename(filenames[0]);
    setActiveEngine(template.engine);
    setBottomTab(template.engine === 'web' ? 'preview' : 'terminal');
    setExecutionOutput(null);
    setConsoleLogs([]);
    setIsDirty(false);
  };

  // --- Tab & File Management ---
  const handleOpenTab = (filename: string) => {
    if (!openTabs.includes(filename)) {
      setOpenTabs([...openTabs, filename]);
    }
    setActiveFilename(filename);
    const config = getRunConfigForFile(filename, Boolean(files['index.html']));
    setActiveEngine(config.engine === 'web' ? 'web' : 'compiler');
    setBottomTab(config.defaultTab);
  };

  const handleCloseTab = (filename: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== filename);
    setOpenTabs(newTabs);
    if (activeFilename === filename && newTabs.length > 0) {
      setActiveFilename(newTabs[newTabs.length - 1]);
    }
  };

  const handleCreateItem = (isFolder: boolean, parentFolder?: string) => {
    const name = newFileNameInput.trim();
    if (!name) return;

    const cleanParent = parentFolder ? parentFolder.replace(/^\/+|\/+$/g, '') : '';
    const fullPath = cleanParent ? `${cleanParent}/${name}` : name;

    if (isFolder) {
      const placeholder = `${fullPath}/.gitkeep`;
      setFiles((prev) => ({
        ...prev,
        [placeholder]: {
          name: placeholder,
          language: 'text',
          content: '',
        },
      }));
      setExpandedFolders((prev) => ({ ...prev, [fullPath]: true }));
    } else {
      if (files[fullPath]) {
        alert(`A file with name "${fullPath}" already exists.`);
        return;
      }
      const newFile: VirtualFile = {
        name: fullPath,
        language: getLanguageForFilename(fullPath),
        content: '',
      };
      setFiles((prev) => ({ ...prev, [fullPath]: newFile }));
      setOpenTabs((prev) => (!prev.includes(fullPath) ? [...prev, fullPath] : prev));
      setActiveFilename(fullPath);
      if (cleanParent) {
        setExpandedFolders((prev) => ({ ...prev, [cleanParent]: true }));
      }
    }
    setNewItemModal({ open: false, isFolder: false });
    setNewFileNameInput('');
    setIsDirty(true);
  };

  const handleDeleteFile = (filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (Object.keys(files).length <= 1) {
      alert('Cannot delete the last remaining file in the project.');
      return;
    }
    if (confirm(`Delete file "${filePath}"?`)) {
      const updated = { ...files };
      delete updated[filePath];
      setFiles(updated);
      handleCloseTab(filePath);
      setIsDirty(true);
    }
  };

  const handleDeleteFolder = (folderPath: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const folderPrefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    const matchingFiles = Object.keys(files).filter((f) => f === folderPath || f.startsWith(folderPrefix));

    if (confirm(`Delete folder "${folderPath}" and all ${matchingFiles.length} file(s) inside it?`)) {
      const updated = { ...files };
      matchingFiles.forEach((f) => {
        delete updated[f];
        handleCloseTab(f);
      });
      setFiles(updated);
      setIsDirty(true);
    }
  };

  const handleCommitRename = (oldPath: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setRenamingPath(null);
      return;
    }

    // If it's an exact file
    if (files[oldPath]) {
      const parts = oldPath.split('/');
      let targetPath: string;
      if (trimmed.includes('/')) {
        targetPath = trimmed.replace(/^\/+/, '');
      } else {
        parts[parts.length - 1] = trimmed;
        targetPath = parts.join('/');
      }

      if (targetPath === oldPath) {
        setRenamingPath(null);
        return;
      }
      if (files[targetPath]) {
        alert(`A file named "${targetPath}" already exists.`);
        return;
      }

      const fileObj = files[oldPath];
      const updated = { ...files };
      delete updated[oldPath];
      updated[targetPath] = {
        ...fileObj,
        name: targetPath,
        language: getLanguageForFilename(targetPath),
      };
      setFiles(updated);
      setOpenTabs((prev) => prev.map((t) => (t === oldPath ? targetPath : t)));
      if (activeFilename === oldPath) setActiveFilename(targetPath);
      setIsDirty(true);
      setRenamingPath(null);
      return;
    }

    // If it's a folder (renames all descendant file paths)
    const oldPrefix = oldPath.endsWith('/') ? oldPath : `${oldPath}/`;
    const parentParts = oldPath.split('/');
    parentParts.pop();
    const newFolderPath = parentParts.length > 0 ? `${parentParts.join('/')}/${trimmed}` : trimmed;
    const newPrefix = `${newFolderPath}/`;

    const updated = { ...files };
    let changed = false;

    Object.keys(files).forEach((f) => {
      if (f === oldPath || f.startsWith(oldPrefix)) {
        const rest = f.substring(oldPath.length);
        const newFileKey = `${newFolderPath}${rest}`;
        updated[newFileKey] = {
          ...files[f],
          name: newFileKey,
        };
        delete updated[f];
        changed = true;
      }
    });

    if (changed) {
      setFiles(updated);
      setOpenTabs((prev) =>
        prev.map((t) => (t.startsWith(oldPrefix) ? `${newPrefix}${t.substring(oldPrefix.length)}` : t === oldPath ? newFolderPath : t))
      );
      if (activeFilename.startsWith(oldPrefix)) {
        setActiveFilename(`${newPrefix}${activeFilename.substring(oldPrefix.length)}`);
      }
      setIsDirty(true);
    }
    setRenamingPath(null);
  };

  const handlePurgeCache = () => {
    const junkKeys = Object.keys(files).filter(
      (f) => f.includes('__pycache__') || f.endsWith('.pyc') || f.includes('.DS_Store') || f.includes('.git/')
    );
    if (junkKeys.length === 0) {
      alert('No bytecode or cache files found in the project.');
      return;
    }
    if (confirm(`Remove ${junkKeys.length} cache / bytecode file(s) (__pycache__, *.pyc)?`)) {
      const updated = { ...files };
      junkKeys.forEach((k) => {
        delete updated[k];
        handleCloseTab(k);
      });
      setFiles(updated);
      setIsDirty(true);
    }
  };

  // --- Optimized Upload Files / Project ZIP / Folder with Parallel Batching ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setProjectLoadingState({
      isLoading: true,
      message: `Loading ${uploadedFiles.length} file(s)...`,
      progress: 10,
    });

    try {
      const fileList = Array.from(uploadedFiles);
      const newFiles: Record<string, VirtualFile> = {};
      const newTabNames: string[] = [];
      const JUNK_PATTERNS = ['node_modules/', '.git/', '.venv/', '__pycache__/', '.DS_Store', '__MACOSX/'];

      let processed = 0;
      const readPromises = fileList.map((file) => {
        return new Promise<void>((resolve) => {
          const rawPath = (file as any).webkitRelativePath || file.name;
          const normalizedPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');

          // Filter out heavy junk directories
          if (JUNK_PATTERNS.some((junk) => normalizedPath.includes(junk))) {
            resolve();
            return;
          }

          // Protect heap from giant binary files (> 3MB)
          if (file.size > 3 * 1024 * 1024) {
            resolve();
            return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            const content = (event.target?.result as string) || '';
            newFiles[normalizedPath] = {
              name: normalizedPath,
              language: getLanguageForFilename(normalizedPath),
              content,
            };
            if (newTabNames.length < 5) {
              newTabNames.push(normalizedPath);
            }
            processed++;
            setProjectLoadingState((prev) => ({
              ...prev,
              progress: Math.min(95, Math.round((processed / fileList.length) * 100)),
            }));
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsText(file);
        });
      });

      await Promise.all(readPromises);

      if (Object.keys(newFiles).length > 0) {
        setFiles((prev) => ({ ...prev, ...newFiles }));
        const firstKey = newTabNames[0] || Object.keys(newFiles)[0];
        setOpenTabs((prev) => Array.from(new Set([...prev, ...newTabNames])));
        setActiveFilename(firstKey);
        setIsDirty(true);
      }
    } finally {
      setTimeout(() => {
        setProjectLoadingState({ isLoading: false, message: '', progress: 100 });
      }, 250);
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const zipFile = e.target.files?.[0];
    if (!zipFile) return;

    setProjectLoadingState({
      isLoading: true,
      message: `Extracting ${zipFile.name}...`,
      progress: 20,
    });

    try {
      const zip = await JSZip.loadAsync(zipFile);
      const newFiles: Record<string, VirtualFile> = {};
      const newTabNames: string[] = [];
      const JUNK_PATTERNS = ['node_modules/', '.git/', '.venv/', '__pycache__/', '.DS_Store', '__MACOSX/'];

      const zipEntries = Object.values(zip.files).filter((entry) => !entry.dir);
      let completed = 0;

      const promises = zipEntries.map(async (zipEntry) => {
        const cleanPath = zipEntry.name.replace(/\\/g, '/').replace(/^\/+/, '');

        if (JUNK_PATTERNS.some((junk) => cleanPath.includes(junk))) {
          return;
        }

        try {
          const content = await zipEntry.async('string');
          newFiles[cleanPath] = {
            name: cleanPath,
            language: getLanguageForFilename(cleanPath),
            content,
          };
          if (newTabNames.length < 5) {
            newTabNames.push(cleanPath);
          }
        } catch (e) {
          // ignore unreadable binary
        } finally {
          completed++;
          setProjectLoadingState((prev) => ({
            ...prev,
            progress: Math.min(95, Math.round((completed / Math.max(1, zipEntries.length)) * 100)),
          }));
        }
      });

      await Promise.all(promises);

      if (Object.keys(newFiles).length > 0) {
        setFiles(newFiles);
        setOpenTabs(newTabNames.length > 0 ? newTabNames : [Object.keys(newFiles)[0]]);
        setActiveFilename(newTabNames.length > 0 ? newTabNames[0] : Object.keys(newFiles)[0]);
        setProjectName(zipFile.name.replace(/\.zip$/i, ''));
        setIsDirty(true);
      }
    } catch (err) {
      alert('Failed to parse ZIP archive.');
    } finally {
      setTimeout(() => {
        setProjectLoadingState({ isLoading: false, message: '', progress: 100 });
      }, 250);
    }
  };

  const handleExportZip = async () => {
    const zip = new JSZip();
    Object.values(files).forEach((f) => {
      zip.file(f.name, f.content);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-export.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Toast Notification Helper ---
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setSessionToast({ show: true, message, type });
    setTimeout(() => {
      setSessionToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  }, []);

  // --- Initial Session Restoration (PostgreSQL for Auth Users / Local Draft for Guests) ---
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      if (initialCode) return; // If code was sent from chat prompt, keep it

      if (!isAuthenticated) {
        // Guest mode: restore local draft if available
        try {
          const draft = localStorage.getItem('phantom_ide_draft_session');
          if (draft) {
            const parsed = JSON.parse(draft);
            if (parsed.files && Object.keys(parsed.files).length > 0 && isMounted) {
              setFiles(parsed.files);
              if (parsed.projectName) setProjectName(parsed.projectName);
              if (parsed.openTabs) setOpenTabs(parsed.openTabs);
              if (parsed.activeFilename) setActiveFilename(parsed.activeFilename);
              if (parsed.currentTemplate) setCurrentTemplate(parsed.currentTemplate);
              setSyncStatus('local');
            }
          }
        } catch {
          // ignore draft parse error
        }
        return;
      }

      // Authenticated Mode: Load active project from PostgreSQL
      try {
        setSyncStatus('saving');
        const res = await api.getProjects();
        if (isMounted && res.projects && res.projects.length > 0) {
          const latest = res.projects[0];
          const fullProj = await api.getProject(latest.id);
          if (isMounted && fullProj.project) {
            const loadedFiles: Record<string, VirtualFile> = {};
            Object.entries(fullProj.project.files).forEach(([name, val]: [string, any]) => {
              loadedFiles[name] =
                typeof val === 'string'
                  ? { name, language: getLanguageForFilename(name), content: val }
                  : val;
            });
            setFiles(loadedFiles);
            const fnames = Object.keys(loadedFiles);
            setOpenTabs(fnames.slice(0, 5));
            setActiveFilename(fnames[0] || 'index.html');
            setProjectName(fullProj.project.name);
            setCurrentProjectId(fullProj.project.id);
            setCurrentTemplate(fullProj.project.template || 'web');
            setActiveEngine(fullProj.project.template === 'web' ? 'web' : 'compiler');
            setSyncStatus('synced');
            setLastSavedAt(new Date(fullProj.project.last_updated || Date.now()));
            setIsDirty(false);
            showToast(`Loaded Cloud session "${fullProj.project.name}"`, 'info');
          }
        } else if (isMounted) {
          setSyncStatus('synced');
        }
      } catch (err) {
        if (isMounted) setSyncStatus('local');
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, initialCode, showToast]);

  // --- Debounced Auto-Save to PostgreSQL when Logged In ---
  useEffect(() => {
    if (!isDirty) return;

    setSyncStatus('unsaved');

    const timeout = setTimeout(async () => {
      if (isAuthenticated) {
        try {
          setSyncStatus('saving');
          const res = await api.saveProject({
            id: currentProjectId || undefined,
            name: projectName.trim() || 'Untitled Project',
            template: currentTemplate,
            files,
          });
          setCurrentProjectId(res.project_id);
          setSyncStatus('synced');
          setLastSavedAt(new Date());
          setIsDirty(false);
        } catch {
          setSyncStatus('unsaved');
        }
      } else {
        // Save locally for guest
        try {
          localStorage.setItem(
            'phantom_ide_draft_session',
            JSON.stringify({
              files,
              projectName,
              activeFilename,
              openTabs,
              currentTemplate,
              timestamp: Date.now(),
            })
          );
          setSyncStatus('local');
        } catch {
          // ignore
        }
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, [files, projectName, currentTemplate, isDirty, isAuthenticated, currentProjectId, activeFilename, openTabs]);

  // --- Project Persistence Handlers (PostgreSQL Cloud Storage) ---
  const handleSaveProject = async (customName?: string) => {
    const targetName = (customName || projectName).trim() || 'Untitled Project';
    setSaveLoading(true);
    setSyncStatus('saving');
    try {
      const res = await api.saveProject({
        id: currentProjectId || undefined,
        name: targetName,
        template: currentTemplate,
        files,
      });
      setCurrentProjectId(res.project_id);
      setProjectName(targetName);
      setSyncStatus('synced');
      setLastSavedAt(new Date());
      setIsDirty(false);
      setSaveModalOpen(false);
      showToast(`Project "${targetName}" saved to Cloud!`, 'success');
    } catch (err: any) {
      setSyncStatus('unsaved');
      showToast(err.message || 'Failed to save project to Cloud.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFetchProjects = async () => {
    setLoadingProjects(true);
    setLoadModalOpen(true);
    try {
      const res = await api.getProjects();
      setSavedProjectsList(res.projects || []);
    } catch {
      setSavedProjectsList([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleLoadProject = async (id: string) => {
    setProjectLoadingState({
      isLoading: true,
      message: 'Loading project from PostgreSQL...',
      progress: 40,
    });
    try {
      const res = await api.getProject(id);
      if (res.project) {
        const loadedFiles: Record<string, VirtualFile> = {};
        Object.entries(res.project.files).forEach(([name, val]: [string, any]) => {
          loadedFiles[name] =
            typeof val === 'string'
              ? { name, language: getLanguageForFilename(name), content: val }
              : val;
        });
        setFiles(loadedFiles);
        const fnames = Object.keys(loadedFiles);
        setOpenTabs(fnames.slice(0, 5));
        setActiveFilename(fnames[0] || 'index.html');
        setProjectName(res.project.name);
        setCurrentProjectId(res.project.id);
        setCurrentTemplate(res.project.template || 'web');
        setActiveEngine(res.project.template === 'web' ? 'web' : 'compiler');
        setLoadModalOpen(false);
        setIsDirty(false);
        setSyncStatus('synced');
        setLastSavedAt(new Date(res.project.last_updated || Date.now()));
        showToast(`Loaded "${res.project.name}" successfully!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load project.', 'error');
    } finally {
      setTimeout(() => {
        setProjectLoadingState({ isLoading: false, message: '', progress: 100 });
      }, 250);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this saved project?')) {
      try {
        await api.deleteProject(id);
        setSavedProjectsList((prev) => prev.filter((p) => p.id !== id));
        if (currentProjectId === id) {
          setCurrentProjectId(null);
        }
        showToast('Project deleted from Cloud database.', 'info');
      } catch {
        showToast('Failed to delete project.', 'error');
      }
    }
  };

  const handleCreateNewProject = (templateKey: string) => {
    const tmpl = STARTER_TEMPLATES[templateKey] || STARTER_TEMPLATES.web;
    setFiles(tmpl.files);
    const fnames = Object.keys(tmpl.files);
    setOpenTabs(fnames.slice(0, 5));
    setActiveFilename(fnames[0] || 'index.html');
    const newTitle = `New ${tmpl.name.split(' ')[0]} Project`;
    setProjectName(newTitle);
    setCurrentProjectId(null);
    setCurrentTemplate(templateKey);
    setActiveEngine(tmpl.engine);
    setBottomTab(tmpl.engine === 'web' ? 'preview' : 'terminal');
    setIsDirty(true);
    setLoadModalOpen(false);
    showToast(`Started new ${tmpl.name} session.`, 'info');
  };

  // --- Keyboard Shortcut (Ctrl+S / Cmd+S for Cloud Save) ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isAuthenticated) {
          handleSaveProject();
        } else {
          setSaveModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAuthenticated, currentProjectId, projectName, currentTemplate, files]);

  // --- Language-Specific Indentation & Formatting Configurations ---
  const getIndentConfig = (lang?: string, fname?: string) => {
    const l = (lang || '').toLowerCase();
    const name = (fname || '').toLowerCase();
    // 4-space languages (Python, Java, C, C++, Rust, C#, PHP)
    if (
      ['python', 'py', 'java', 'c', 'cpp', 'c++', 'csharp', 'cs', 'rust', 'rs', 'php'].includes(l) ||
      name.endsWith('.py') ||
      name.endsWith('.java') ||
      name.endsWith('.cpp') ||
      name.endsWith('.c') ||
      name.endsWith('.cs') ||
      name.endsWith('.rs') ||
      name.endsWith('.php')
    ) {
      return { size: 4, spaces: '    ', label: '4 spaces' };
    }
    // Tab languages
    if (l === 'go' || name.endsWith('.go')) {
      return { size: 4, spaces: '    ', label: '4 spaces' };
    }
    // 2-space languages (JavaScript, TypeScript, React, HTML, CSS, SCSS, JSON, YAML, etc.)
    return { size: 2, spaces: '  ', label: '2 spaces' };
  };

  // --- Advanced Language-Aware Code Editor Engine ---
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const lang = (activeFile?.language || '').toLowerCase();
    const fname = (activeFilename || '').toLowerCase();
    const { size: tabSize, spaces: tabSpaces } = getIndentConfig(lang, fname);
    const isPython = lang === 'python' || fname.endsWith('.py');

    // 0. Run Code / Live Preview: Ctrl + Enter / Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
      return;
    }

    // 0. Save Project: Ctrl + S / Cmd + S
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (isAuthenticated) {
        handleSaveProject();
      } else {
        setSaveModalOpen(true);
      }
      return;
    }

    // 0. Find & Replace: Ctrl + F / Cmd + F
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setShowFindReplace((prev) => !prev);
      return;
    }

    // 0. Open Shortcuts Cheat Sheet: F1 or Ctrl + Shift + P
    if (e.key === 'F1' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p')) {
      e.preventDefault();
      setShortcutsModalOpen((prev) => !prev);
      return;
    }

    // 1. Toggle Comment (Ctrl + / or Cmd + /) for ALL programming languages
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      let commentPrefix = '// ';
      if (['python', 'ruby', 'perl', 'r', 'shell', 'bash', 'powershell', 'yaml', 'toml', 'dockerfile'].includes(lang) ||
          fname.endsWith('.py') || fname.endsWith('.rb') || fname.endsWith('.pl') || fname.endsWith('.r') ||
          fname.endsWith('.sh') || fname.endsWith('.ps1') || fname.endsWith('.yaml') || fname.endsWith('.yml') ||
          fname.endsWith('.toml')) {
        commentPrefix = '# ';
      } else if (['html', 'xml', 'markdown'].includes(lang) || fname.endsWith('.html') || fname.endsWith('.xml') || fname.endsWith('.md')) {
        commentPrefix = '<!-- ';
      } else if (['css', 'scss', 'sass', 'less'].includes(lang) || fname.endsWith('.css') || fname.endsWith('.scss')) {
        commentPrefix = '/* ';
      } else if (lang === 'sql' || lang === 'lua' || fname.endsWith('.sql') || fname.endsWith('.lua')) {
        commentPrefix = '-- ';
      } else if (lang === 'batch' || fname.endsWith('.bat') || fname.endsWith('.cmd')) {
        commentPrefix = 'REM ';
      }

      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const lineEnd = value.indexOf('\n', selectionEnd) === -1 ? value.length : value.indexOf('\n', selectionEnd);
      const selectedBlock = value.substring(lineStart, lineEnd);
      const lines = selectedBlock.split('\n');

      const allCommented = lines.every((l) => l.trim().length === 0 || l.trim().startsWith(commentPrefix.trim()));
      const modifiedLines = lines.map((l) => {
        if (!l.trim()) return l;
        if (allCommented) {
          return l.replace(commentPrefix, '').replace(commentPrefix.trim(), '');
        } else {
          const indentMatch = l.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          return indent + commentPrefix + l.substring(indent.length);
        }
      });

      const modifiedBlock = modifiedLines.join('\n');
      const nextVal = value.substring(0, lineStart) + modifiedBlock + value.substring(lineEnd);
      updateActiveContent(nextVal);
      return;
    }

    // 2. Duplicate Line or Selection (Ctrl + D / Cmd + D)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (selectionStart === selectionEnd) {
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const lineEnd = value.indexOf('\n', selectionStart) === -1 ? value.length : value.indexOf('\n', selectionStart);
        const currentLine = value.substring(lineStart, lineEnd);
        const nextVal = value.substring(0, lineEnd) + '\n' + currentLine + value.substring(lineEnd);
        updateActiveContent(nextVal);
        setTimeout(() => {
          if (editorTextareaRef.current) {
            const newPos = selectionStart + currentLine.length + 1;
            editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = newPos;
          }
        }, 0);
      } else {
        const selected = value.substring(selectionStart, selectionEnd);
        const nextVal = value.substring(0, selectionEnd) + selected + value.substring(selectionEnd);
        updateActiveContent(nextVal);
        setTimeout(() => {
          if (editorTextareaRef.current) {
            editorTextareaRef.current.selectionStart = selectionEnd;
            editorTextareaRef.current.selectionEnd = selectionEnd + selected.length;
          }
        }, 0);
      }
      return;
    }

    // 3. Move Line Up / Down (Alt + ArrowUp / Alt + ArrowDown)
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const lineEnd = value.indexOf('\n', selectionEnd) === -1 ? value.length : value.indexOf('\n', selectionEnd);
      const currentBlock = value.substring(lineStart, lineEnd);

      if (e.key === 'ArrowUp' && lineStart > 0) {
        const prevLineStart = value.lastIndexOf('\n', lineStart - 2) + 1;
        const prevLine = value.substring(prevLineStart, lineStart - 1);
        const nextVal = value.substring(0, prevLineStart) + currentBlock + '\n' + prevLine + value.substring(lineEnd);
        updateActiveContent(nextVal);
        const offset = prevLine.length + 1;
        setTimeout(() => {
          if (editorTextareaRef.current) {
            editorTextareaRef.current.selectionStart = Math.max(0, selectionStart - offset);
            editorTextareaRef.current.selectionEnd = Math.max(0, selectionEnd - offset);
          }
        }, 0);
      } else if (e.key === 'ArrowDown' && lineEnd < value.length) {
        const nextLineEnd = value.indexOf('\n', lineEnd + 1) === -1 ? value.length : value.indexOf('\n', lineEnd + 1);
        const nextLine = value.substring(lineEnd + 1, nextLineEnd);
        const nextVal = value.substring(0, lineStart) + nextLine + '\n' + currentBlock + value.substring(nextLineEnd);
        updateActiveContent(nextVal);
        const offset = nextLine.length + 1;
        setTimeout(() => {
          if (editorTextareaRef.current) {
            editorTextareaRef.current.selectionStart = selectionStart + offset;
            editorTextareaRef.current.selectionEnd = selectionEnd + offset;
          }
        }, 0);
      }
      return;
    }

    // 4. Delete Current Line (Ctrl + Shift + K / Cmd + Shift + K)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const lineEnd = value.indexOf('\n', selectionStart) === -1 ? value.length : value.indexOf('\n', selectionStart);
      const nextVal = lineEnd < value.length
        ? value.substring(0, lineStart) + value.substring(lineEnd + 1)
        : value.substring(0, Math.max(0, lineStart - 1));
      updateActiveContent(nextVal);
      setTimeout(() => {
        if (editorTextareaRef.current) {
          editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = lineStart;
        }
      }, 0);
      return;
    }

    // 2. Tab & Shift+Tab (Multi-line and Single-line smart indentation)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (selectionStart === selectionEnd) {
        if (!e.shiftKey) {
          // Insert spaces for tab
          const nextVal = value.substring(0, selectionStart) + tabSpaces + value.substring(selectionEnd);
          updateActiveContent(nextVal);
          setTimeout(() => {
            if (editorTextareaRef.current) {
              editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = selectionStart + tabSpaces.length;
            }
          }, 0);
        } else {
          // Dedent current line
          const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
          const lineEnd = value.indexOf('\n', selectionStart) === -1 ? value.length : value.indexOf('\n', selectionStart);
          const line = value.substring(lineStart, lineEnd);
          const match = line.match(new RegExp(`^ {1,${tabSize}}`));
          if (match) {
            const spacesToRemove = match[0].length;
            const nextVal = value.substring(0, lineStart) + line.substring(spacesToRemove) + value.substring(lineEnd);
            updateActiveContent(nextVal);
            setTimeout(() => {
              if (editorTextareaRef.current) {
                editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = Math.max(lineStart, selectionStart - spacesToRemove);
              }
            }, 0);
          }
        }
      } else {
        // Multi-line selection block indent / dedent
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const lineEnd = value.indexOf('\n', selectionEnd) === -1 ? value.length : value.indexOf('\n', selectionEnd);
        const selectedBlock = value.substring(lineStart, lineEnd);
        const lines = selectedBlock.split('\n');

        let startOffset = 0;
        let totalOffset = 0;

        const modifiedLines = lines.map((l, idx) => {
          if (!e.shiftKey) {
            if (idx === 0) startOffset += tabSpaces.length;
            totalOffset += tabSpaces.length;
            return tabSpaces + l;
          } else {
            const match = l.match(new RegExp(`^ {1,${tabSize}}`));
            const count = match ? match[0].length : 0;
            if (idx === 0) startOffset -= count;
            totalOffset -= count;
            return l.substring(count);
          }
        });

        const nextVal = value.substring(0, lineStart) + modifiedLines.join('\n') + value.substring(lineEnd);
        updateActiveContent(nextVal);
        setTimeout(() => {
          if (editorTextareaRef.current) {
            editorTextareaRef.current.selectionStart = Math.max(lineStart, selectionStart + startOffset);
            editorTextareaRef.current.selectionEnd = Math.max(lineStart, selectionEnd + totalOffset);
          }
        }, 0);
      }
      return;
    }

    // 3. Smart Language-Specific Auto-Indentation on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.substring(lineStart, selectionStart);
      const indentMatch = currentLine.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : '';
      const trimmedLine = currentLine.trim();

      const charBefore = selectionStart > 0 ? value[selectionStart - 1] : '';
      const charAfter = selectionStart < value.length ? value[selectionStart] : '';

      // Split-Brace Expansion: Enter pressed between {}, (), or []
      const isSplitBrace = (charBefore === '{' && charAfter === '}') ||
                            (charBefore === '(' && charAfter === ')') ||
                            (charBefore === '[' && charAfter === ']');

      if (isSplitBrace) {
        const insertText = '\n' + currentIndent + tabSpaces + '\n' + currentIndent;
        const nextVal = value.substring(0, selectionStart) + insertText + value.substring(selectionEnd);
        updateActiveContent(nextVal);
        const newCursorPos = selectionStart + 1 + currentIndent.length + tabSpaces.length;
        setTimeout(() => {
          if (editorTextareaRef.current) {
            editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = newCursorPos;
          }
        }, 0);
        return;
      }

      // Language-specific extra indent rules
      let extraIndent = '';
      if (isPython) {
        // Python colon rule (def, if, for, while, class, with, try, except, elif, else:)
        if (trimmedLine.endsWith(':')) {
          extraIndent = tabSpaces;
        }
      } else {
        // C-family & JS/TS block rule ({, [, (, =>, ->, case, default:)
        if (
          trimmedLine.endsWith('{') ||
          trimmedLine.endsWith('(') ||
          trimmedLine.endsWith('[') ||
          trimmedLine.endsWith('=>') ||
          trimmedLine.endsWith('->') ||
          (trimmedLine.endsWith(':') && (trimmedLine.startsWith('case ') || trimmedLine === 'default:'))
        ) {
          extraIndent = tabSpaces;
        }
      }

      const insertText = '\n' + currentIndent + extraIndent;
      const nextVal = value.substring(0, selectionStart) + insertText + value.substring(selectionEnd);
      updateActiveContent(nextVal);
      const newCursorPos = selectionStart + insertText.length;
      setTimeout(() => {
        if (editorTextareaRef.current) {
          editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
      return;
    }

    // 4. Auto-Closing Pairs, Selection Wrapping & Overtyping
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
    const closeChars = [')', ']', '}', '"', "'", '`'];

    // Overtype closing bracket/quote if already next to cursor
    if (closeChars.includes(e.key) && selectionStart === selectionEnd && value[selectionStart] === e.key) {
      e.preventDefault();
      setTimeout(() => {
        if (editorTextareaRef.current) {
          editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = selectionStart + 1;
        }
      }, 0);
      return;
    }

    if (pairs[e.key]) {
      const openChar = e.key;
      const closeChar = pairs[openChar];

      // Wrap selected text: e.g. select text -> press ( -> (text)
      if (selectionStart !== selectionEnd) {
        e.preventDefault();
        const selectedText = value.substring(selectionStart, selectionEnd);
        const wrapped = openChar + selectedText + closeChar;
        const nextVal = value.substring(0, selectionStart) + wrapped + value.substring(selectionEnd);
        updateActiveContent(nextVal);
        setTimeout(() => {
          if (editorTextareaRef.current) {
            editorTextareaRef.current.selectionStart = selectionStart + 1;
            editorTextareaRef.current.selectionEnd = selectionEnd + 1;
          }
        }, 0);
        return;
      }

      // Avoid auto-closing single quotes on contractions like it's or don't
      const prevChar = selectionStart > 0 ? value[selectionStart - 1] : '';
      if ((openChar === "'" || openChar === '"') && /[a-zA-Z0-9]/.test(prevChar)) {
        return;
      }

      e.preventDefault();
      const nextVal = value.substring(0, selectionStart) + openChar + closeChar + value.substring(selectionEnd);
      updateActiveContent(nextVal);
      setTimeout(() => {
        if (editorTextareaRef.current) {
          editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = selectionStart + 1;
        }
      }, 0);
      return;
    }

    // 5. Smart Backspace (Soft-tab Dedent & Pair Deletion)
    if (e.key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
      const charBefore = value[selectionStart - 1];
      const charAfter = selectionStart < value.length ? value[selectionStart] : '';

      // Pair deletion: e.g. cursor inside () -> Backspace deletes both
      const isPair = (charBefore === '(' && charAfter === ')') ||
                     (charBefore === '[' && charAfter === ']') ||
                     (charBefore === '{' && charAfter === '}') ||
                     (charBefore === '"' && charAfter === '"') ||
                     (charBefore === "'" && charAfter === "'") ||
                     (charBefore === '`' && charAfter === '`');

      if (isPair) {
        e.preventDefault();
        const nextVal = value.substring(0, selectionStart - 1) + value.substring(selectionStart + 1);
        updateActiveContent(nextVal);
        setTimeout(() => {
          if (editorTextareaRef.current) {
            editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = selectionStart - 1;
          }
        }, 0);
        return;
      }

      // Soft-tab backspace (delete entire tab width if only leading spaces precede cursor)
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const beforeCursor = value.substring(lineStart, selectionStart);

      if (beforeCursor.length > 0 && /^\s+$/.test(beforeCursor) && beforeCursor.length % tabSize === 0) {
        e.preventDefault();
        const deleteCount = tabSize;
        const nextVal = value.substring(0, selectionStart - deleteCount) + value.substring(selectionStart);
        updateActiveContent(nextVal);
        setTimeout(() => {
          if (editorTextareaRef.current) {
            editorTextareaRef.current.selectionStart = editorTextareaRef.current.selectionEnd = selectionStart - deleteCount;
          }
        }, 0);
        return;
      }
    }
  };

  const updateActiveContent = (newContent: string) => {
    if (!activeFilename || !files[activeFilename]) return;
    setFiles({
      ...files,
      [activeFilename]: {
        ...files[activeFilename],
        content: newContent,
      },
    });
    setIsDirty(true);
  };

  // --- Find & Replace Execution ---
  const handleFindNext = () => {
    if (!searchQuery || !editorTextareaRef.current) return;
    const content = files[activeFilename]?.content || '';
    const idx = content.toLowerCase().indexOf(searchQuery.toLowerCase(), editorTextareaRef.current.selectionEnd);
    if (idx !== -1) {
      editorTextareaRef.current.focus();
      editorTextareaRef.current.setSelectionRange(idx, idx + searchQuery.length);
    } else {
      // Loop around
      const firstIdx = content.toLowerCase().indexOf(searchQuery.toLowerCase(), 0);
      if (firstIdx !== -1) {
        editorTextareaRef.current.focus();
        editorTextareaRef.current.setSelectionRange(firstIdx, firstIdx + searchQuery.length);
      }
    }
  };

  const handleReplaceOne = () => {
    if (!searchQuery || !editorTextareaRef.current) return;
    const { selectionStart, selectionEnd, value } = editorTextareaRef.current;
    const selectedText = value.substring(selectionStart, selectionEnd);
    if (selectedText.toLowerCase() === searchQuery.toLowerCase()) {
      const nextVal = value.substring(0, selectionStart) + replaceQuery + value.substring(selectionEnd);
      updateActiveContent(nextVal);
      setTimeout(() => handleFindNext(), 0);
    } else {
      handleFindNext();
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const content = files[activeFilename]?.content || '';
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const nextVal = content.replace(regex, replaceQuery);
    updateActiveContent(nextVal);
  };

  // --- AI Coding Assistant ---
  const handleTriggerAI = async (
    action: 'fix' | 'explain' | 'optimize' | 'generate_tests' | 'analyze',
    errorOverride?: string
  ) => {
    setAiOpen(true);
    setAiLoading(true);
    setAiActiveAction(action);
    setAiResponse(null);

    const activeFile = files[activeFilename] || Object.values(files)[0];
    const errorMsg = errorOverride || executionOutput?.stderr || executionOutput?.error || '';

    try {
      const res = await api.compilerAIAction(
        action,
        activeFile.content,
        activeFile.language,
        activeFile.name,
        errorMsg
      );
      setAiResponse(res);
    } catch (err: any) {
      setAiResponse({
        success: false,
        action,
        error: err.message || 'AI processing error. Verify GEMINI_API_KEY in .env',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAIFix = (codeOverride?: string) => {
    const codeToApply = codeOverride || aiResponse?.result?.fixed_code || aiResponse?.result?.optimized_code;
    if (codeToApply) {
      updateActiveContent(codeToApply);
      showToast('Applied AI code directly to editor!', 'success');
    }
  };

  const handleSendAIChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChatInput.trim()) return;

    const userPrompt = aiChatInput.trim();
    setAiChatMessages((prev) => [...prev, { role: 'user', text: userPrompt }]);
    setAiChatInput('');
    setAiLoading(true);

    const activeFile = files[activeFilename] || Object.values(files)[0];

    try {
      const res = await api.compilerAIAction(
        'explain',
        activeFile.content,
        activeFile.language,
        activeFile.name,
        undefined,
        userPrompt
      );

      const aiText = res.result?.explanation || res.raw_response || 'Analyzed code context.';
      setAiChatMessages((prev) => [...prev, { role: 'assistant', text: aiText }]);
    } catch (err: any) {
      setAiChatMessages((prev) => [...prev, { role: 'assistant', text: 'Error connecting to AI Assistant.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const activeFile = files[activeFilename] || { name: 'untitled', language: 'text', content: '' };
  const lineCount = useMemo(() => activeFile.content.split('\n').length, [activeFile.content]);

  // Detect whether active code contains interactive input statements (input, cin >>, scanf, etc.)
  const codeRequiresInput = useMemo(() => {
    const content = activeFile.content || '';
    return /\b(input\s*\(|raw_input\s*\(|cin\s*>>|scanf\s*\(|readLine\s*\(|Scanner\b|gets\s*\(|fgets\s*\(|sys\.stdin|Console\.ReadLine|prompt\s*\()/.test(content);
  }, [activeFile.content]);

  // Current dynamic execution interface configuration based on active file extension
  const currentRunConfig = useMemo(() => {
    return getRunConfigForFile(activeFilename, Boolean(files['index.html']));
  }, [activeFilename, files]);

  // Memoize fileTree signature so typing in active code doesn't trigger expensive tree rebuilds
  const fileKeysSignature = useMemo(() => {
    return Object.keys(files).sort().join('::');
  }, [files]);

  const fileTree = useMemo(() => {
    return buildFileTree(files, hideCacheFiles);
  }, [fileKeysSignature, hideCacheFiles]);

  const handleEditorScroll = () => {
    if (editorTextareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = editorTextareaRef.current.scrollTop;
    }
  };

  const getFileIcon = (filename: string) => {
    return <FileIcon filename={filename} className="w-3.5 h-3.5 flex-shrink-0" />;
  };

  const renderTreeNode = (node: FileTreeNode, depth = 0) => {
    if (node.isFolder) {
      const isExpanded = expandedFolders[node.path] !== false;
      const isRenaming = renamingPath === node.path;

      return (
        <div key={node.path} className="select-none">
          <div
            style={{ paddingLeft: `${depth * 10 + 6}px` }}
            className="group flex items-center justify-between py-1 pr-1.5 rounded-lg text-xs cursor-pointer hover:bg-zinc-900 transition-colors text-zinc-300"
            onClick={() => {
              setExpandedFolders((prev) => ({
                ...prev,
                [node.path]: !isExpanded,
              }));
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
              <span className="text-zinc-500 hover:text-white">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-amber-400/90" />
              ) : (
                <Folder className="w-3.5 h-3.5 flex-shrink-0 text-amber-400/80" />
              )}

              {isRenaming ? (
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  onBlur={() => handleCommitRename(node.path, renameInput)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommitRename(node.path, renameInput);
                    if (e.key === 'Escape') setRenamingPath(null);
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  className="bg-black border border-white text-white text-xs rounded px-1.5 py-0.5 w-full focus:outline-none"
                />
              ) : (
                <span className="truncate font-medium text-zinc-200">{node.name}</span>
              )}
            </div>

            {/* Folder Actions: Add File, Add Folder, Rename, Delete */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNewItemModal({ open: true, isFolder: false, parentFolder: node.path });
                }}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                title="New File in Folder"
              >
                <FilePlus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNewItemModal({ open: true, isFolder: true, parentFolder: node.path });
                }}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                title="New Subfolder"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingPath(node.path);
                  setRenameInput(node.name);
                }}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                title="Rename Folder"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleDeleteFolder(node.path, e)}
                className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded"
                title="Delete Folder"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {isExpanded && node.children && (
            <div className="space-y-0.5">
              {Object.values(node.children).map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Node is a File
    const isSelected = activeFilename === node.path;
    const isRenaming = renamingPath === node.path;

    return (
      <div
        key={node.path}
        style={{ paddingLeft: `${depth * 10 + 6}px` }}
        onClick={() => handleOpenTab(node.path)}
        className={`group flex items-center justify-between py-1 pr-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
          isSelected
            ? 'bg-zinc-850 text-white font-semibold border border-zinc-700/60'
            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
          {getFileIcon(node.name)}

          {isRenaming ? (
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onBlur={() => handleCommitRename(node.path, renameInput)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitRename(node.path, renameInput);
                if (e.key === 'Escape') setRenamingPath(null);
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="bg-black border border-white text-white text-xs rounded px-1.5 py-0.5 w-full focus:outline-none"
            />
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </div>

        {/* Rename & Delete Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRenamingPath(node.path);
              setRenameInput(node.name);
            }}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
            title="Rename File"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => handleDeleteFile(node.path, e)}
            className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded"
            title="Delete File"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-black text-white select-none overflow-hidden relative">
      {/* Hidden File Inputs for Upload */}
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFileUpload}
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
      />
      <input type="file" ref={zipInputRef} onChange={handleZipUpload} accept=".zip" className="hidden" />

      {/* ========================================================================= */}
      {/* TOP CONTROL BAR                                                           */}
      {/* ========================================================================= */}
      <div className="h-12 bg-zinc-950 border-b border-zinc-800 px-3 flex items-center justify-between gap-2 flex-shrink-0 z-20">
        {/* Left: Back to Chat / Studio Title & Cloud Sync Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackToChat ? (
            <button
              onClick={onBackToChat}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Return to Chat"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
              <Boxes className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Dev Studio</span>
            </div>
          )}

          <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

          {/* Project Name and Cloud Status Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSaveModalOpen(true)}
              className="font-bold text-xs text-white hover:text-zinc-300 transition-colors truncate max-w-[110px] sm:max-w-[150px]"
              title="Click to rename or save project (Ctrl+S)"
            >
              {projectName}
            </button>

            {/* Automatic Language & Runtime Detection Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 select-none shadow-sm"
              title={`Auto-detected execution runtime from active file "${activeFilename}": ${currentRunConfig.actionName}`}
            >
              <span className="text-sm leading-none">{getLanguageIcon(activeFilename, activeFile?.language)}</span>
              <span className="font-semibold text-zinc-100">{getLanguageDisplayName(activeFilename, activeFile?.language)}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold uppercase tracking-wider">
                AUTO
              </span>
            </div>

            {isAuthenticated ? (
              syncStatus === 'saving' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-800/60 text-sky-400 text-[10px] font-mono animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span className="hidden sm:inline">Saving to Cloud...</span>
                </span>
              ) : syncStatus === 'synced' ? (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px] font-mono"
                  title={lastSavedAt ? `Saved to PostgreSQL at ${lastSavedAt.toLocaleTimeString()}` : 'Cloud Synced'}
                >
                  <Cloud className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">Cloud Synced</span>
                </span>
              ) : (
                <button
                  onClick={() => handleSaveProject()}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800/60 text-amber-300 hover:bg-amber-900/60 text-[10px] font-mono transition-colors"
                  title="Click to Save (Ctrl+S)"
                >
                  <CloudOff className="w-2.5 h-2.5" />
                  <span>Unsaved (Save)</span>
                </button>
              )
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white text-[10px] font-medium transition-colors"
                title="Sign in to save and sync your projects to PostgreSQL database"
              >
                <Lock className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Guest Mode (Sign In)</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Action Controls: Run, Stop, Save, Open, Export, AI */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* RUN / PREVIEW CODE BUTTON (DYNAMIC ACCORDING TO FILE EXTENSION) */}
          <button
            onClick={() => handleRunCode()}
            disabled={isExecuting}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-glow transition-all active:scale-95 disabled:opacity-50"
            title={`${currentRunConfig.actionName} (Ctrl+Enter)`}
          >
            {isExecuting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
            ) : currentRunConfig.iconType === 'globe' ? (
              <Globe className="w-3.5 h-3.5 text-black" />
            ) : currentRunConfig.iconType === 'terminal' ? (
              <Terminal className="w-3.5 h-3.5 text-black" />
            ) : currentRunConfig.iconType === 'eye' ? (
              <Eye className="w-3.5 h-3.5 text-black" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-black text-black" />
            )}
            <span>{currentRunConfig.badgeLabel}</span>
          </button>

          {/* STOP CODE BUTTON */}
          {isExecuting && (
            <button
              onClick={handleStopCode}
              className="p-1.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 transition-colors"
              title="Stop Running Process"
            >
              <Square className="w-3.5 h-3.5 fill-rose-300" />
            </button>
          )}

          {/* SAVE PROJECT BUTTON */}
          <button
            onClick={() => handleSaveProject()}
            disabled={saveLoading}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Save Project to PostgreSQL (Ctrl+S)"
          >
            {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" /> : <Save className="w-3.5 h-3.5 text-zinc-400" />}
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* OPEN PROJECTS MANAGER */}
          <button
            onClick={handleFetchProjects}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Open Saved Projects in PostgreSQL"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Projects</span>
          </button>

          {/* EXPORT ZIP */}
          <button
            onClick={handleExportZip}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Download Project ZIP"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* KEYBOARD SHORTCUTS BUTTON */}
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Keyboard Shortcuts Cheat Sheet (F1)"
          >
            <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Shortcuts</span>
            <kbd className="hidden lg:inline text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">F1</kbd>
          </button>

          {/* AI ASSISTANT TOGGLE */}
          <button
            onClick={() => setAiOpen(!aiOpen)}
            className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              aiOpen
                ? 'bg-white text-black shadow-mono-glow'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800'
            }`}
            title="AI Coding Assistant"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Suite</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE BODY (FILE EXPLORER | CODE EDITOR | OUTPUT/TERMINAL)       */}
      {/* ========================================================================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* ----------------------------------------------------------------------- */}
        {/* 1. FILE EXPLORER SIDEBAR (RESIZABLE)                                    */}
        {/* ----------------------------------------------------------------------- */}
        <div
          style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
          className={`bg-zinc-950 border-r border-zinc-800 flex flex-col flex-shrink-0 select-none overflow-hidden transition-all ${
            isDraggingSidebar ? 'transition-none duration-0' : 'duration-150'
          }`}
        >
          {/* File Explorer Header & Action Icons */}
          <div className="p-2 border-b border-zinc-800 flex items-center justify-between gap-1 min-w-0 flex-shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 min-w-0 truncate">
              <Folder className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="truncate">Files</span>
            </span>
            <div className="flex items-center gap-0.5 flex-shrink-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setNewItemModal({ open: true, isFolder: false })}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded transition-colors flex-shrink-0"
                title="New File"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setNewItemModal({ open: true, isFolder: true })}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded transition-colors flex-shrink-0"
                title="New Folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded transition-colors flex-shrink-0"
                title="Upload Files"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded transition-colors flex-shrink-0"
                title="Upload Folder"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => zipInputRef.current?.click()}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded transition-colors flex-shrink-0"
                title="Upload ZIP Project"
              >
                <Boxes className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handlePurgeCache}
                className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-850 rounded transition-colors flex-shrink-0"
                title="Purge __pycache__ and *.pyc bytecode"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Bar & Quick Stats */}
          <div className="px-2.5 py-1.5 bg-zinc-900/40 border-b border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
            <span>{Object.keys(files).length} file(s)</span>
            <button
              onClick={() => setHideCacheFiles(!hideCacheFiles)}
              className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                hideCacheFiles ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' : 'hover:text-zinc-200'
              }`}
              title="Toggle hiding __pycache__ and bytecode"
            >
              <Filter className="w-2.5 h-2.5" />
              <span>{hideCacheFiles ? 'Cache Hidden' : 'Hide Cache'}</span>
            </button>
          </div>

          {/* Nested Files Tree */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {Object.keys(fileTree).length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">No files found.</div>
            ) : (
              Object.values(fileTree).map((node) => renderTreeNode(node, 0))
            )}
          </div>

          {/* Quick Engine Switcher Indicator */}
          <div className="p-2.5 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-zinc-300" />
              Engine: <strong className="text-white uppercase">{activeEngine}</strong>
            </span>
            <button
              onClick={() => {
                const nextEngine = activeEngine === 'web' ? 'compiler' : 'web';
                setActiveEngine(nextEngine);
                setBottomTab(nextEngine === 'web' ? 'preview' : 'terminal');
              }}
              className="text-[10px] text-zinc-300 hover:text-white underline"
            >
              Switch
            </button>
          </div>
        </div>

        {/* LEFT PANEL RESIZER HANDLE */}
        <div
          onMouseDown={handleSidebarMouseDown}
          onDoubleClick={() => setSidebarWidth(240)}
          className={`w-1 hover:w-1.5 cursor-col-resize z-20 flex-shrink-0 group relative flex items-center justify-center transition-all select-none ${
            isDraggingSidebar ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] w-1.5' : 'bg-transparent hover:bg-zinc-600'
          }`}
          title="Drag to resize File Explorer (Double-click to reset)"
        >
          <div className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize" />
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* 2. CENTER: MULTI-TAB CODE EDITOR                                        */}
        {/* ----------------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col min-w-0 bg-black">
          {/* Tab Strip */}
          <div className="h-9 bg-zinc-950 border-b border-zinc-800 flex items-center px-1 overflow-x-auto select-none no-scrollbar">
            {openTabs.map((filename) => {
              const isActive = activeFilename === filename;
              const displayName = filename.split('/').pop() || filename;

              return (
                <div
                  key={filename}
                  onClick={() => setActiveFilename(filename)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs border-r border-zinc-800 cursor-pointer transition-colors max-w-[180px] group ${
                    isActive
                      ? 'bg-black text-white font-medium border-t-2 border-t-white'
                      : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                  title={filename}
                >
                  {getFileIcon(displayName)}
                  <span className="truncate">{displayName}</span>
                  <button
                    onClick={(e) => handleCloseTab(filename, e)}
                    className="p-0.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => setNewItemModal({ open: true, isFolder: false })}
              className="p-1.5 text-zinc-500 hover:text-white transition-colors"
              title="New File"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Find & Replace Bar (Ctrl+F) */}
          {showFindReplace && (
            <div className="p-2 bg-zinc-900 border-b border-zinc-800 flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 bg-black border border-zinc-700 rounded-lg px-2 py-1 flex-1 min-w-[160px]">
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Find in file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFindNext();
                    if (e.key === 'Escape') setShowFindReplace(false);
                  }}
                  autoFocus
                  className="bg-transparent text-white placeholder-zinc-500 w-full focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-black border border-zinc-700 rounded-lg px-2 py-1 flex-1 min-w-[160px]">
                <Replace className="w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Replace with..."
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleReplaceOne();
                  }}
                  className="bg-transparent text-white placeholder-zinc-500 w-full focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleFindNext}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-medium"
                >
                  Find
                </button>
                <button
                  onClick={handleReplaceOne}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-medium"
                >
                  Replace
                </button>
                <button
                  onClick={handleReplaceAll}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-medium"
                >
                  All
                </button>
                <button
                  onClick={() => setShowFindReplace(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {searchMatches > 0 && (
                <span className="text-[10px] text-zinc-400 font-mono">
                  {searchMatches} match(es)
                </span>
              )}
            </div>
          )}

          {/* Editor Workspace (Gutter + Textarea) */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Line Number Gutter */}
            <div
              ref={gutterRef}
              className="w-12 bg-zinc-950/80 text-zinc-600 font-mono text-xs py-3 select-none text-right pr-3 border-r border-zinc-850 overflow-hidden leading-6"
            >
              {Array.from({ length: Math.max(1, lineCount) }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code Input Textarea */}
            <textarea
              ref={editorTextareaRef}
              value={activeFile.content}
              onChange={(e) => updateActiveContent(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              onScroll={handleEditorScroll}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              className="flex-1 bg-black text-zinc-100 font-mono text-xs leading-6 p-3 resize-none focus:outline-none overflow-auto selection:bg-zinc-700 selection:text-white"
              placeholder="// Write code here..."
            />
          </div>

          {/* Editor Status Bar */}
          <div className="h-6 bg-zinc-950 border-t border-zinc-850 px-3 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <FileIcon filename={activeFilename} className="w-3 h-3 flex-shrink-0" />
                <strong className="text-zinc-200">{activeFilename}</strong>
              </span>
              <span>Lines: {lineCount}</span>
              <span>Size: {activeFile.content.length} B</span>
              <span>Lang: <strong className="text-zinc-300">{activeFile.language}</strong></span>
              <span className="hidden sm:inline text-zinc-400">
                Runner: <strong className="text-white uppercase">{currentRunConfig.runnerLanguage}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span>UTF-8</span>
              <span>Spaces: {getIndentConfig(activeFile.language, activeFilename).size} ({getIndentConfig(activeFile.language, activeFilename).label})</span>
              <button
                onClick={() => setShortcutsModalOpen(true)}
                className="hover:text-zinc-200 text-zinc-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-850"
                title="View All Keyboard Shortcuts & Cheatsheet (F1)"
              >
                <Keyboard className="w-3 h-3 text-zinc-400" />
                <span className="hidden md:inline">Shortcuts</span>
                <span className="text-[10px] opacity-75">(F1)</span>
              </button>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ready
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL RESIZER HANDLE */}
        <div
          onMouseDown={handleOutputMouseDown}
          onDoubleClick={() => setOutputWidth(480)}
          className={`w-1 hover:w-1.5 cursor-col-resize z-20 flex-shrink-0 group relative flex items-center justify-center transition-all select-none ${
            isDraggingOutput ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] w-1.5' : 'bg-transparent hover:bg-zinc-600'
          }`}
          title="Drag to resize Output & Preview (Double-click to reset)"
        >
          <div className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize" />
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* 3. RIGHT/BOTTOM: DUAL OUTPUT DRAWER (PREVIEW / MULTI-TAB TERMINAL / LOGS) */}
        {/* ----------------------------------------------------------------------- */}
        <div
          style={{ width: isOutputCollapsed ? 0 : outputWidth }}
          className={`bg-zinc-950 border-l border-zinc-800 flex flex-col flex-shrink-0 overflow-hidden transition-all ${
            isDraggingOutput ? 'transition-none duration-0' : 'duration-150'
          }`}
        >
          {/* Output Drawer Tabs & Terminal Bar */}
          <div className="h-10 bg-zinc-950 border-b border-zinc-800 px-2 flex items-center justify-between gap-1 min-w-0 flex-shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
              {activeEngine === 'web' && (
                <button
                  onClick={() => setBottomTab('preview')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 ${
                    bottomTab === 'preview'
                      ? 'bg-zinc-850 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>Preview</span>
                </button>
              )}

              <button
                onClick={() => setBottomTab('terminal')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 ${
                  bottomTab === 'terminal'
                    ? 'bg-zinc-850 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Terminal ({terminalTabs.length})</span>
              </button>

              {activeEngine === 'web' && (
                <button
                  onClick={() => setBottomTab('console')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 ${
                    bottomTab === 'console'
                      ? 'bg-zinc-850 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Logs ({consoleLogs.length})</span>
                </button>
              )}
            </div>

            {/* Output Header Tools */}
            {bottomTab === 'preview' ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setDeviceView('desktop')}
                  className={`p-1 rounded ${deviceView === 'desktop' ? 'text-white' : 'text-zinc-500'}`}
                  title="Desktop View"
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeviceView('tablet')}
                  className={`p-1 rounded ${deviceView === 'tablet' ? 'text-white' : 'text-zinc-500'}`}
                  title="Tablet View (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeviceView('mobile')}
                  className={`p-1 rounded ${deviceView === 'mobile' ? 'text-white' : 'text-zinc-500'}`}
                  title="Mobile View (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="p-1 text-zinc-400 hover:text-white"
                  title="Reload Preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : bottomTab === 'terminal' ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    handleFetchPorts();
                    setPortsModalOpen(true);
                  }}
                  className="px-2 py-1 text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 rounded text-[11px] flex items-center gap-1 transition-colors"
                  title="Active Ports & Process Monitor"
                >
                  <Network className="w-3 h-3 text-cyan-400" />
                  <span className="hidden sm:inline">Ports</span>
                </button>
                <button
                  onClick={() => handleKillTerminalProcess(activeTerminalTab.id)}
                  disabled={!activeTerminalTab.isExecuting && !isExecuting}
                  className="px-2 py-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 disabled:opacity-30 rounded text-[11px] flex items-center gap-1 transition-colors"
                  title="Terminate running process (Kill / Stop)"
                >
                  <StopCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Kill</span>
                </button>
                <button
                  onClick={() => handleClearTerminal(activeTerminalTab.id)}
                  className="px-2 py-1 text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 rounded text-[11px] flex items-center gap-1 transition-colors"
                  title="Clear Terminal Output"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
                <button
                  onClick={() => setShowTerminalSettings((prev) => !prev)}
                  className={`p-1 rounded text-zinc-400 hover:text-white ${showTerminalSettings ? 'bg-zinc-800 text-white' : ''}`}
                  title="Terminal Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setConsoleLogs([])}
                  className="p-1 text-zinc-400 hover:text-white text-xs flex items-center gap-1"
                  title="Clear Console Logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Terminal Settings Popover Bar */}
          {bottomTab === 'terminal' && showTerminalSettings && (
            <div className="bg-zinc-900/90 border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between text-xs text-zinc-300 animate-slide-down">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-medium">Font Size:</span>
                  <input
                    type="range"
                    min={10}
                    max={16}
                    value={terminalFontSize}
                    onChange={(e) => setTerminalFontSize(Number(e.target.value))}
                    className="w-20 accent-white"
                  />
                  <span className="text-[11px] text-zinc-200 font-mono">{terminalFontSize}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-medium">Word Wrap:</span>
                  <button
                    onClick={() => setTerminalWordWrap(!terminalWordWrap)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      terminalWordWrap ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {terminalWordWrap ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowTerminalSettings(false)}
                className="text-zinc-500 hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Multi-Tab Terminal Subheader Bar */}
          {bottomTab === 'terminal' && (
            <div className="h-8 bg-zinc-950 border-b border-zinc-850 px-2 flex items-center justify-between gap-1 text-xs select-none">
              {/* Tab Selector List */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
                {terminalTabs.map((tab) => {
                  const isActive = tab.id === activeTerminalTabId;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTerminalTabId(tab.id)}
                      className={`group px-2.5 py-1 rounded-t flex items-center gap-1.5 cursor-pointer text-xs transition-colors border-b-2 font-mono ${
                        isActive
                          ? 'bg-zinc-900 text-white font-bold border-emerald-400'
                          : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300 border-transparent'
                      }`}
                    >
                      <TerminalSquare className={`w-3 h-3 ${isActive ? 'text-emerald-400' : 'text-zinc-600'}`} />
                      <span className="truncate max-w-[100px]">{tab.name}</span>
                      {tab.isExecuting && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      )}
                      {terminalTabs.length > 1 && (
                        <button
                          onClick={(e) => handleCloseTerminalTab(tab.id, e)}
                          className="p-0.5 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Close Terminal"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => handleNewTerminalTab()}
                  className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded transition-colors"
                  title="New Terminal Tab"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Working directory indicator */}
              <div className="hidden lg:flex items-center gap-1 text-[11px] text-zinc-500 font-mono px-1">
                <span className="text-zinc-600">cwd:</span>
                <span className="text-zinc-400">{projectName || 'workspace'}</span>
              </div>
            </div>
          )}

          {/* Drawer Content */}
          <div className="flex-1 overflow-hidden relative bg-black flex flex-col">
            {/* 1. Web Preview Frame */}
            {bottomTab === 'preview' && (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900/40 p-2 overflow-auto custom-scrollbar">
                <iframe
                  key={previewKey}
                  ref={previewIframeRef}
                  srcDoc={srcDoc}
                  title="Live Web Sandbox Preview"
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  className={`h-full bg-white transition-all rounded-xl shadow-2xl border border-zinc-700 ${
                    deviceView === 'mobile'
                      ? 'w-[375px]'
                      : deviceView === 'tablet'
                      ? 'w-[768px]'
                      : 'w-full'
                  }`}
                />
              </div>
            )}

            {/* 2. Unified Multi-Tab Interactive Terminal */}
            {bottomTab === 'terminal' && (
              <div
                className="w-full h-full flex flex-col p-2.5 font-mono overflow-hidden bg-black selection:bg-zinc-800"
                style={{ fontSize: `${terminalFontSize}px` }}
                onClick={() => terminalInputRef.current?.focus()}
              >
                {/* Scrollable Output Stream */}
                <div
                  className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar"
                  style={{ whiteSpace: terminalWordWrap ? 'pre-wrap' : 'pre' }}
                >
                  {activeTerminalTab.entries.map((entry) => {
                    if (entry.type === 'system') {
                      return (
                        <div
                          key={entry.id}
                          className="text-zinc-500 whitespace-pre-wrap leading-relaxed py-1 border-b border-zinc-900 text-[11px]"
                        >
                          {entry.text}
                        </div>
                      );
                    }
                    if (entry.type === 'command') {
                      return (
                        <div
                          key={entry.id}
                          className="text-zinc-100 font-semibold whitespace-pre-wrap leading-relaxed flex items-start gap-1.5 pt-1.5 font-mono text-xs"
                        >
                          <span className="text-zinc-500 select-none font-normal">PS C:\PhantomAI\{projectName}&gt;</span>
                          <span className="text-zinc-200">{entry.command || entry.text.replace(/^\$\s*/, '')}</span>
                          {entry.timestamp && (
                            <span className="text-[10px] text-zinc-600 font-normal ml-auto select-none">
                              {entry.timestamp}
                            </span>
                          )}
                        </div>
                      );
                    }
                    if (entry.type === 'stderr') {
                      return (
                        <div
                          key={entry.id}
                          className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl my-1.5 space-y-2 text-xs font-mono shadow-sm"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-1.5 border-b border-zinc-850 pb-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/50 font-bold uppercase tracking-wider">
                              Process Exit Code: {entry.exitCode ?? 1}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDiagnoseTerminalError(entry);
                                }}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs rounded-xl flex items-center gap-1.5 transition-colors font-sans font-semibold border border-zinc-700/60"
                              >
                                <Sparkles className="w-3 h-3 text-amber-300" />
                                <span>Explain with Phantom AI</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(entry.text);
                                }}
                                className="p-1 px-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs rounded-lg flex items-center gap-1 font-sans border border-zinc-750"
                                title="Copy stderr"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-red-400/90 whitespace-pre-wrap leading-relaxed">
                            {entry.text}
                          </div>
                        </div>
                      );
                    }
                    if (entry.type === 'ai-suggestion') {
                      return (
                        <div
                          key={entry.id}
                          className="bg-zinc-900 border border-zinc-750 p-3.5 rounded-2xl my-2 space-y-2.5 shadow-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 font-sans">
                              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                              <span>AI Suggested Command</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (entry.command) {
                                    handleExecuteTerminalCommand(entry.command);
                                  }
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all font-sans shadow-sm active:scale-95"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Run Command</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (entry.command) {
                                    setTerminalTabs((prev) =>
                                      prev.map((t) =>
                                        t.id === activeTerminalTabId ? { ...t, currentInput: entry.command || '' } : t
                                      )
                                    );
                                    terminalInputRef.current?.focus();
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl flex items-center gap-1.5 font-sans border border-zinc-700"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Insert</span>
                              </button>
                            </div>
                          </div>
                          <div className="bg-black p-2.5 rounded-xl font-mono text-xs text-zinc-100 border border-zinc-800 flex items-center justify-between">
                            <code>{entry.command}</code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (entry.command) navigator.clipboard.writeText(entry.command);
                              }}
                              className="text-zinc-500 hover:text-white p-1"
                              title="Copy command"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {entry.explanation && (
                            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{entry.explanation}</p>
                          )}
                        </div>
                      );
                    }
                    if (entry.type === 'ai-fix') {
                      return (
                        <div
                          key={entry.id}
                          className="bg-zinc-900 border border-zinc-750 p-3.5 rounded-2xl my-2 space-y-2.5 shadow-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 font-sans">
                              <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Phantom AI Error Diagnosis</span>
                            </span>
                            {entry.fixCommand && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExecuteTerminalCommand(entry.fixCommand);
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 font-sans transition-all shadow-sm active:scale-95"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Apply Fix</span>
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-zinc-300 leading-relaxed font-sans">{entry.text}</div>
                          {entry.fixCommand && (
                            <div className="bg-black p-2.5 rounded-xl font-mono text-xs text-zinc-100 border border-zinc-800">
                              <code>{entry.fixCommand}</code>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div key={entry.id} className="text-zinc-200 whitespace-pre-wrap leading-relaxed">
                        {entry.text}
                      </div>
                    );
                  })}
                  {activeTerminalTab.isExecuting && (
                    <div className="text-amber-400 flex items-center gap-2 py-1 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Running in workspace...</span>
                    </div>
                  )}
                  <div ref={terminalBottomRef} />
                </div>

                {/* Sticky Interactive Terminal Prompt Line */}
                <form
                  onSubmit={handleTerminalSubmit}
                  onClick={(e) => e.stopPropagation()}
                  className="pt-2 border-t border-zinc-900 flex items-center gap-1.5 flex-shrink-0 bg-black"
                >
                  <span className="text-emerald-400 font-bold select-none text-xs pl-1">
                    PS C:\PhantomAI\{projectName}&gt;
                  </span>
                  <input
                    ref={terminalInputRef}
                    type="text"
                    value={activeTerminalTab.currentInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTerminalTabs((prev) =>
                        prev.map((t) => (t.id === activeTerminalTabId ? { ...t, currentInput: val } : t))
                      );
                    }}
                    onKeyDown={handleTerminalKeyDown}
                    placeholder="Type commands (e.g. python app.py, javac Main.java, java Main, dir, ls)..."
                    disabled={activeTerminalTab.isExecuting}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={activeTerminalTab.isExecuting || !activeTerminalTab.currentInput.trim()}
                    className="p-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-40 rounded-lg text-white font-mono text-xs flex items-center gap-1 transition-colors"
                    title="Execute Command (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Docked "Ask Phantom AI" Assistant Prompt Bar */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 pt-2 border-t border-zinc-900/80 flex flex-col gap-1.5 flex-shrink-0"
                >
                  {/* Quick Action Suggestion Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans select-none flex-shrink-0 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      Ask:
                    </span>
                    <button
                      onClick={() => handleAskPhantomSubmit('Why did my last command fail? Explain the error.')}
                      className="px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 whitespace-nowrap transition-colors font-sans"
                    >
                      ✨ Explain Last Error
                    </button>
                    <button
                      onClick={() => handleAskPhantomSubmit('Create python virtual environment and install requirements')}
                      className="px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 whitespace-nowrap transition-colors font-sans"
                    >
                      📦 Setup venv & dependencies
                    </button>
                    <button
                      onClick={() => handleAskPhantomSubmit('Show current git status and modified files')}
                      className="px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 whitespace-nowrap transition-colors font-sans"
                    >
                      🌿 Git Status
                    </button>
                    <button
                      onClick={() => handleAskPhantomSubmit('Start the backend application')}
                      className="px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 whitespace-nowrap transition-colors font-sans"
                    >
                      🚀 Run Application
                    </button>
                  </div>

                  {/* Natural Language Prompt Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskPhantomSubmit();
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <div className="relative flex-1 flex items-center">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 select-none pointer-events-none" />
                      <input
                        type="text"
                        value={askPhantomInput}
                        onChange={(e) => setAskPhantomInput(e.target.value)}
                        placeholder="Ask Phantom (e.g. 'Install Flask and create venv', 'Why is my server not starting?')..."
                        disabled={askPhantomLoading}
                        className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-amber-400/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 font-sans focus:outline-none transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={askPhantomLoading || !askPhantomInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-bold text-xs font-sans flex items-center gap-1 transition-colors flex-shrink-0 shadow-md"
                      title="Send to Phantom AI"
                    >
                      {askPhantomLoading ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <CornerDownLeft className="w-3 h-3" />
                      )}
                      <span className="hidden sm:inline">Ask AI</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* 4. Intercepted Console Logs */}
            {bottomTab === 'console' && (
              <div className="w-full h-full p-2 overflow-y-auto font-mono text-xs space-y-1 custom-scrollbar">
                {consoleLogs.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No console messages captured yet.</p>
                  </div>
                ) : (
                  consoleLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-1.5 px-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                        log.level === 'error'
                          ? 'bg-rose-950/30 border-rose-900/50 text-rose-300'
                          : log.level === 'warn'
                          ? 'bg-amber-950/30 border-amber-900/50 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                      }`}
                    >
                      <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                      <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DOCKABLE AI CODING ASSISTANT FLYOUT PANEL                              */}
      {/* ========================================================================= */}
      {aiOpen && (
        <>
          {/* Backdrop for small screens */}
          <div
            onClick={() => setAiOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 lg:hidden"
          />

          <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] max-w-full bg-zinc-950/98 backdrop-blur-xl border-l border-zinc-800 shadow-2xl flex flex-col z-40 overflow-hidden animate-fade-in">
            {/* AI Header - Sticky & Always Pinned */}
            <div className="h-12 px-3.5 border-b border-zinc-850 flex items-center justify-between flex-shrink-0 bg-zinc-950 z-10 select-none">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-white/10 border border-white/20 text-white flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5 truncate">
                    <span>AI Assistant</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 font-mono font-normal truncate max-w-[120px]">
                      {activeFilename}
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {(aiResponse || aiChatMessages.length > 0) && (
                  <button
                    onClick={() => {
                      setAiResponse(null);
                      setAiActiveAction(null);
                      setAiChatMessages([]);
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors"
                    title="Clear AI History"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setAiOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 border border-transparent hover:border-zinc-700 transition-all flex items-center gap-1 group"
                  title="Close AI Assistant (Esc)"
                >
                  <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 hidden sm:inline font-mono">Esc</span>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 1-Click Action Buttons - Pinned */}
            <div className="p-2.5 border-b border-zinc-850 grid grid-cols-2 gap-1.5 flex-shrink-0 bg-zinc-900/30 select-none">
              <button
                onClick={() => handleTriggerAI('fix')}
                disabled={aiLoading}
                className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  aiActiveAction === 'fix'
                    ? 'bg-white text-black border-white shadow-mono-glow'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ Fix Code</span>
              </button>

              <button
                onClick={() => handleTriggerAI('explain')}
                disabled={aiLoading}
                className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  aiActiveAction === 'explain'
                    ? 'bg-white text-black border-white shadow-mono-glow'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-800'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>💡 Explain</span>
              </button>

              <button
                onClick={() => handleTriggerAI('optimize')}
                disabled={aiLoading}
                className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  aiActiveAction === 'optimize'
                    ? 'bg-white text-black border-white shadow-mono-glow'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>🚀 Optimize</span>
              </button>

              <button
                onClick={() => handleTriggerAI('generate_tests')}
                disabled={aiLoading}
                className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  aiActiveAction === 'generate_tests'
                    ? 'bg-white text-black border-white shadow-mono-glow'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-800'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>🧪 Tests</span>
              </button>
            </div>

            {/* AI Scrollable Body (Responses + Conversation) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-xs custom-scrollbar">
              {/* 1. Action Response */}
              {aiResponse && (
                <div className="space-y-3">
                  {aiResponse.error ? (
                    <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300">
                      {aiResponse.error}
                    </div>
                  ) : (
                    <>
                      {/* Summary / Explanation */}
                      {aiResponse.result?.explanation && (
                        <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-200 leading-relaxed">
                          <strong className="text-white block mb-1">Analysis:</strong>
                          {aiResponse.result.explanation}
                        </div>
                      )}

                      {/* Complexity Analysis */}
                      {aiResponse.result?.time_complexity && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800">
                            <span className="text-[10px] text-zinc-400 uppercase font-bold">Time</span>
                            <p className="font-mono text-white font-bold">{aiResponse.result.time_complexity}</p>
                          </div>
                          <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800">
                            <span className="text-[10px] text-zinc-400 uppercase font-bold">Space</span>
                            <p className="font-mono text-white font-bold">{aiResponse.result.space_complexity}</p>
                          </div>
                        </div>
                      )}

                      {/* Fixed / Optimized Code with Apply Button */}
                      {(aiResponse.result?.fixed_code || aiResponse.result?.optimized_code) && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-white">Suggested Code:</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  const code = aiResponse.result?.fixed_code || aiResponse.result?.optimized_code;
                                  if (code) {
                                    navigator.clipboard.writeText(code);
                                    showToast('Copied to clipboard!', 'info');
                                  }
                                }}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                                title="Copy Code"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                              <button
                                onClick={() => handleApplyAIFix()}
                                className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg text-xs transition-transform active:scale-95 flex items-center gap-1 shadow-mono-glow"
                              >
                                <Check className="w-3 h-3" />
                                <span>Apply to Editor</span>
                              </button>
                            </div>
                          </div>
                          <pre className="p-3 bg-black border border-zinc-800 rounded-xl text-zinc-200 font-mono text-[11px] overflow-x-auto max-h-60 leading-5 custom-scrollbar">
                            {aiResponse.result.fixed_code || aiResponse.result.optimized_code}
                          </pre>
                        </div>
                      )}

                      {/* Generated Test Cases */}
                      {aiResponse.result?.test_cases && (
                        <div className="space-y-2">
                          <strong className="text-white block">Generated Test Cases:</strong>
                          {aiResponse.result.test_cases.map((tc: any, i: number) => (
                            <div key={i} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 space-y-1">
                              <span className="font-bold text-white">{tc.name}</span>
                              <p className="text-zinc-400 text-[11px]">{tc.description}</p>
                              <div className="font-mono text-[10px] text-zinc-300">
                                <div>Input: <code>{tc.input || '(empty)'}</code></div>
                                <div>Expected: <code>{tc.expected}</code></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 2. Interactive Chat Messages */}
              {aiChatMessages.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Conversation</div>
                  {aiChatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`p-2.5 rounded-2xl max-w-[90%] text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-white text-black font-medium'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Loading Indicator */}
              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-white" />
                  <p className="text-xs">Analyzing code with AI...</p>
                </div>
              )}

              {/* 4. Empty State */}
              {!aiResponse && aiChatMessages.length === 0 && !aiLoading && (
                <div className="text-center py-12 text-zinc-500 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-xs">Select an AI action above or ask questions below.</p>
                </div>
              )}

              <div ref={aiChatEndRef} />
            </div>

            {/* Pinned Bottom Chat Input */}
            <div className="p-2.5 border-t border-zinc-800 bg-zinc-950 flex-shrink-0">
              <form onSubmit={handleSendAIChat} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  placeholder={`Ask AI about ${activeFilename}...`}
                  className="flex-1 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-sans"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiChatInput.trim()}
                  className="p-2 rounded-xl bg-white hover:bg-zinc-200 text-black disabled:opacity-40 transition-colors flex-shrink-0"
                  title="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 5. MODALS (SAVE PROJECT | OPEN PROJECTS | NEW FILE)                      */}
      {/* ========================================================================= */}

      {/* SAVE PROJECT MODAL */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Save className="w-4 h-4 text-white" />
                Save Project to Database
              </h3>
              <button onClick={() => setSaveModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-medium">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. My Algorithm Project"
                  className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-xs">
                <span className="text-zinc-400">Environment:</span>
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span>{getLanguageIcon(activeFilename, activeFile?.language)}</span>
                  <span>{getLanguageDisplayName(activeFilename, activeFile?.language)}</span>
                  <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    AUTO
                  </span>
                </span>
              </div>

              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-400">
                <span>Saving <strong>{Object.keys(files).length} files</strong> directly into your PostgreSQL database.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveProject()}
                disabled={saveLoading}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-mono-glow transition-all active:scale-95 flex items-center gap-1.5"
              >
                {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Project</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPEN SAVED PROJECTS MODAL */}
      {loadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-base font-bold text-white">Project Sessions</h3>
                  <p className="text-[11px] text-zinc-400">Manage and switch between your cloud database workspaces</p>
                </div>
              </div>
              <button
                onClick={() => setLoadModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Template Starters */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Start New Project</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(STARTER_TEMPLATES).slice(0, 4).map(([k, tmpl]) => (
                  <button
                    key={k}
                    onClick={() => handleCreateNewProject(k)}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-500 text-left transition-all group"
                  >
                    <div className="text-lg mb-1">{tmpl.icon}</div>
                    <div className="text-xs font-bold text-white truncate">{tmpl.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{tmpl.engine}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Guest Banner if not authenticated */}
            {!isAuthenticated && (
              <div className="p-3 bg-zinc-900/80 border border-zinc-750 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-zinc-300">
                    Sign in to sync, backup, and access your code projects from anywhere.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setLoadModalOpen(false);
                    onOpenAuth?.();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors flex-shrink-0"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Saved Projects in PostgreSQL */}
            <div className="space-y-1.5 flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>Saved Cloud Workspaces</span>
                <span className="font-mono text-zinc-500">{savedProjectsList.length} saved</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {loadingProjects ? (
                  <div className="py-10 text-center text-zinc-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span className="text-xs">Connecting to PostgreSQL database...</span>
                  </div>
                ) : savedProjectsList.length === 0 ? (
                  <div className="py-10 text-center text-zinc-500 space-y-2">
                    <Boxes className="w-8 h-8 mx-auto opacity-30" />
                    <p className="text-xs">No saved cloud projects found.</p>
                    <p className="text-[11px] text-zinc-600">Save your current workspace with Ctrl+S or click "Save".</p>
                  </div>
                ) : (
                  savedProjectsList.map((proj) => {
                    const isCurrent = currentProjectId === proj.id;
                    return (
                      <div
                        key={proj.id}
                        onClick={() => handleLoadProject(proj.id)}
                        className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isCurrent
                            ? 'bg-zinc-850 border-white shadow-mono-subtle'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-xs truncate">{proj.name}</h4>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-700 text-emerald-400 text-[9px] font-mono">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            Template: <span className="uppercase text-zinc-300 font-mono">{proj.template}</span> • Updated: {new Date(proj.last_updated).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleDeleteProject(proj.id, e)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                            title="Delete Project from Cloud"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-black bg-white px-3 py-1 rounded-lg">
                            {isCurrent ? 'Active' : 'Open'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SESSION NOTIFICATION TOAST */}
      {sessionToast.show && (
        <div className="fixed bottom-10 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold shadow-2xl backdrop-blur-md animate-fade-in">
          {sessionToast.type === 'success' ? (
            <CheckCheck className="w-4 h-4 text-emerald-400" />
          ) : sessionToast.type === 'error' ? (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          ) : (
            <Cloud className="w-4 h-4 text-sky-400" />
          )}
          <span>{sessionToast.message}</span>
        </div>
      )}

      {/* NEW ITEM MODAL (FILE / FOLDER) */}
      {newItemModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {newItemModal.isFolder ? <FolderPlus className="w-4 h-4 text-amber-400" /> : <FilePlus className="w-4 h-4 text-white" />}
                {newItemModal.isFolder ? 'Create New Folder' : 'Create New File'}
              </h3>
              <button
                onClick={() => setNewItemModal({ open: false, isFolder: false })}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newItemModal.parentFolder && (
              <div className="text-[11px] text-zinc-400 font-mono bg-zinc-900 px-3 py-1.5 rounded-lg truncate">
                Folder: <span className="text-zinc-200 font-semibold">{newItemModal.parentFolder}/</span>
              </div>
            )}

            <input
              type="text"
              value={newFileNameInput}
              onChange={(e) => setNewFileNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateItem(newItemModal.isFolder, newItemModal.parentFolder);
                if (e.key === 'Escape') setNewItemModal({ open: false, isFolder: false });
              }}
              placeholder={newItemModal.isFolder ? 'e.g. models, utils, components' : 'e.g. helper.py, styles.css, app.ts'}
              autoFocus
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setNewItemModal({ open: false, isFolder: false })}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateItem(newItemModal.isFolder, newItemModal.parentFolder)}
                className="px-3.5 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors"
              >
                {newItemModal.isFolder ? 'Create Folder' : 'Create File'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT LOADING & PROGRESS OVERLAY */}
      {projectLoadingState.isLoading && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-4 animate-fade-in">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <RefreshCw className="w-9 h-9 text-white animate-spin" />
          </div>
          <div className="text-center space-y-1 max-w-xs">
            <h4 className="text-sm font-bold text-white tracking-wide">{projectLoadingState.message}</h4>
            <p className="text-xs text-zinc-400">Indexing workspace & parsing project files...</p>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="bg-white h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(5, projectLoadingState.progress)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* DESTRUCTIVE COMMAND CONFIRMATION MODAL */}
      {destructiveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-rose-900/60 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Potentially Destructive Command</h3>
                <p className="text-xs text-rose-400 font-medium">Safety Confirmation Required</p>
              </div>
            </div>

            <div className="p-3 bg-black rounded-xl border border-rose-900/40 text-xs font-mono text-rose-300 break-all">
              <code>{destructiveModal.command}</code>
            </div>

            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
              <span className="font-semibold text-white">Warning: </span>
              {destructiveModal.warning}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDestructiveModal({ open: false, command: '', warning: '', tabId: 'term-1' })}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cmd = destructiveModal.command;
                  const tabId = destructiveModal.tabId;
                  setDestructiveModal({ open: false, command: '', warning: '', tabId: 'term-1' });
                  handleExecuteTerminalCommand(cmd, undefined, tabId, true);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Execute Anyway</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE PORTS & SERVICES MONITOR MODAL */}
      {portsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Port & Service Monitor</h3>
                  <p className="text-[11px] text-zinc-400">Live inspection of listening developer ports on localhost</p>
                </div>
              </div>
              <button onClick={() => setPortsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
              {portsLoading ? (
                <div className="text-center py-8 text-zinc-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400" />
                  <p className="text-xs">Scanning active localhost ports...</p>
                </div>
              ) : activePorts.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Click &apos;Refresh Scan&apos; to inspect listening ports.
                </div>
              ) : (
                activePorts.map((p) => (
                  <div
                    key={p.port}
                    className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${p.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white font-mono">:{p.port}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                            {p.protocol}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{p.service}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        p.status === 'active'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : 'bg-zinc-800/50 text-zinc-500'
                      }`}>
                        {p.status}
                      </span>
                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title={`Open ${p.url}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
              <span className="text-[11px] text-zinc-500 font-mono">Host: 127.0.0.1</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFetchPorts}
                  disabled={portsLoading}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${portsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Scan</span>
                </button>
                <button
                  onClick={() => setPortsModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KEYBOARD SHORTCUTS MODAL */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-white shadow-inner">
                  <Keyboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Keyboard Shortcuts & Cheat Sheet
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700">
                      F1
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Boost your coding speed with full editor, terminal, and workspace hotkeys
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShortcutsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Category Controls */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between flex-shrink-0">
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/80 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'all', label: 'All Shortcuts' },
                    { id: 'execution', label: '⚡ Run & Terminal' },
                    { id: 'editor', label: '📝 Code Editor' },
                    { id: 'navigation', label: '🧭 Navigation' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setShortcutCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      shortcutCategory === cat.id
                        ? 'bg-white text-black shadow-sm font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Filter Input */}
              <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded-xl px-3 py-1.5 sm:w-64 focus-within:border-zinc-500 transition-colors">
                <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search shortcuts..."
                  value={shortcutFilter}
                  onChange={(e) => setShortcutFilter(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-zinc-500 w-full focus:outline-none font-sans"
                />
                {shortcutFilter && (
                  <button onClick={() => setShortcutFilter('')} className="text-zinc-500 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Shortcuts List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
              {(() => {
                const filtered = IDE_SHORTCUTS.filter((s) => {
                  const matchCat = shortcutCategory === 'all' || s.category === shortcutCategory;
                  const query = shortcutFilter.toLowerCase().trim();
                  if (!query) return matchCat;
                  const matchQuery =
                    s.title.toLowerCase().includes(query) ||
                    s.description.toLowerCase().includes(query) ||
                    s.keys.join(' ').toLowerCase().includes(query) ||
                    (s.badge && s.badge.toLowerCase().includes(query));
                  return matchCat && matchQuery;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-zinc-500 space-y-2">
                      <Keyboard className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-xs">No shortcuts match &quot;{shortcutFilter}&quot;</p>
                      <button
                        onClick={() => {
                          setShortcutFilter('');
                          setShortcutCategory('all');
                        }}
                        className="text-xs text-zinc-300 underline hover:text-white"
                      >
                        Reset filters
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-2">
                    {filtered.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-750 rounded-2xl transition-all flex items-center justify-between gap-4 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white group-hover:text-zinc-100">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-semibold uppercase">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed truncate">
                            {item.description}
                          </p>
                        </div>

                        {/* Keys Badge */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.keys.map((k, i) => (
                            <React.Fragment key={i}>
                              <kbd className="px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-semibold shadow-sm min-w-[24px] text-center">
                                {k}
                              </kbd>
                              {i < item.keys.length - 1 && item.keys.length > 1 && !k.includes('/') && (
                                <span className="text-zinc-500 text-xs font-bold">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer Tips & Quick Actions */}
            <div className="pt-3 border-t border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs flex-shrink-0">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Indentation & Comment delimiters adapt automatically to each language.</span>
              </div>
              <button
                onClick={() => setShortcutsModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors shadow-sm"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN DRAG BARRIER OVERLAY (PREVENTS IFRAME POINTER CAPTURE) */}
      {(isDraggingSidebar || isDraggingOutput) && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none bg-transparent pointer-events-auto" />
      )}
    </div>
  );
};
