import React from 'react';

interface FileIconProps {
  filename: string;
  className?: string;
  size?: number;
}

export const FileIcon: React.FC<FileIconProps> = ({ filename, className = 'w-3.5 h-3.5 flex-shrink-0', size = 14 }) => {
  const lower = (filename || '').toLowerCase().trim();
  const ext = lower.split('.').pop() || '';
  const base = lower.split('/').pop() || '';

  // Special named files
  if (base === 'dockerfile' || base.startsWith('docker-compose')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="2" y="11" width="3" height="3" rx="0.5" fill="#2496ED" />
        <rect x="6" y="11" width="3" height="3" rx="0.5" fill="#2496ED" />
        <rect x="10" y="11" width="3" height="3" rx="0.5" fill="#2496ED" />
        <rect x="6" y="7" width="3" height="3" rx="0.5" fill="#2496ED" />
        <rect x="10" y="7" width="3" height="3" rx="0.5" fill="#2496ED" />
        <rect x="14" y="11" width="3" height="3" rx="0.5" fill="#2496ED" />
        <path d="M22 13c-.4-1.2-1.5-1.5-2-1.5-.2-1-.8-2-2-2.5-.2 0-.4 0-.5.1C17 7.5 15.5 7 14 7v7H2c0 4 3 6 8 6 6 0 10.5-2 12-7z" fill="#2496ED" />
      </svg>
    );
  }

  if (base.startsWith('.git') || base === 'gitignore') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#F05032" />
        <circle cx="8" cy="8" r="2.5" fill="white" />
        <circle cx="8" cy="16" r="2.5" fill="white" />
        <circle cx="16" cy="12" r="2.5" fill="white" />
        <path d="M8 8v8M8 12h5.5l2.5 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (base.startsWith('.env')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#10B981" />
        <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="monospace">ENV</text>
      </svg>
    );
  }

  // 1. Python (.py, .pyw, .pyc)
  if (ext === 'py' || ext === 'pyw' || ext === 'pyc') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M11.9 2C6.9 2 7.2 4.2 7.2 4.2l.01 2.2h4.8v.7H5.2S2 6.7 2 11.7c0 5 2.8 4.8 2.8 4.8h1.7v-2.4s-.1-2.8 2.8-2.8h4.7s2.7.1 2.7-2.6V4.7S17 2 11.9 2zm-2.7 1.5a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"
          fill="#3776AB"
        />
        <path
          d="M12.1 22c5 0 4.7-2.2 4.7-2.2l-.01-2.2H12v-.7h6.8s3.2.4 3.2-4.6c0-5-2.8-4.8-2.8-4.8h-1.7v2.4s.1 2.8-2.8 2.8H10s-2.7-.1-2.7 2.6v4.4s-.3 2.7 4.8 2.7zm2.7-1.5a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8z"
          fill="#FFD43B"
        />
      </svg>
    );
  }

  // 2. JavaScript (.js, .mjs, .cjs)
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#F7DF1E" />
        <path d="M7 16.5c.5.8 1.2 1.3 2.2 1.3 1.2 0 2-.7 2-2.3V8h-2v7.5c0 .5-.2.8-.7.8-.3 0-.6-.2-.8-.5L7 16.5zm8.2-.1c.6.9 1.5 1.4 2.6 1.4 1.5 0 2.4-.8 2.4-2 0-1.2-.7-1.7-2-2.3l-.7-.3c-.8-.4-1.2-.7-1.2-1.3 0-.6.5-1.1 1.3-1.1.7 0 1.2.3 1.6.9l1.4-1c-.7-1-1.7-1.5-3-1.5-1.9 0-3 1.1-3 2.6 0 1.2.7 1.8 1.9 2.3l.7.3c.9.4 1.4.7 1.4 1.4 0 .7-.6 1.2-1.6 1.2-.9 0-1.6-.4-2.1-1.2l-1.3 1.1z" fill="#000000" />
      </svg>
    );
  }

  // 3. TypeScript (.ts)
  if (ext === 'ts') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#3178C6" />
        <path d="M6 10h6v2H9.5v6h-2v-6H6v-2zm8.5 4.5c.6.9 1.5 1.4 2.6 1.4 1.5 0 2.4-.8 2.4-2 0-1.2-.7-1.7-2-2.3l-.7-.3c-.8-.4-1.2-.7-1.2-1.3 0-.6.5-1.1 1.3-1.1.7 0 1.2.3 1.6.9l1.4-1c-.7-1-1.7-1.5-3-1.5-1.9 0-3 1.1-3 2.6 0 1.2.7 1.8 1.9 2.3l.7.3c.9.4 1.4.7 1.4 1.4 0 .7-.6 1.2-1.6 1.2-.9 0-1.6-.4-2.1-1.2l-1.3 1.1z" fill="#FFFFFF" />
      </svg>
    );
  }

  // 4. React / JSX / TSX (.jsx, .tsx)
  if (ext === 'jsx' || ext === 'tsx') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#20232A" />
        <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#61DAFB" strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#61DAFB" strokeWidth="1.5" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#61DAFB" strokeWidth="1.5" transform="rotate(120 12 12)" />
        <circle cx="12" cy="12" r="1.8" fill="#61DAFB" />
      </svg>
    );
  }

  // 5. HTML (.html, .htm)
  if (ext === 'html' || ext === 'htm') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#E34F26" />
        <path d="M5 4l1.5 15 5.5 1.5 5.5-1.5L19 4H5zm11.8 4.5l-.2 2.3H9.2l.2 2.2h6.8l-.5 5.3-3.7 1-3.7-1-.2-2.7h2.2l.1 1.4 1.6.4 1.6-.4.2-2.3H8.8L8.2 6.5h8.8l-.2 2z" fill="#FFFFFF" />
      </svg>
    );
  }

  // 6. CSS (.css)
  if (ext === 'css') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#1572B6" />
        <path d="M5 4l1.5 15 5.5 1.5 5.5-1.5L19 4H5zm11.8 4.5l-.2 2.3H9.2l.2 2.2h6.8l-.5 5.3-3.7 1-3.7-1-.2-2.7h2.2l.1 1.4 1.6.4 1.6-.4.2-2.3H8.8L8.2 6.5h8.8l-.2 2z" fill="#FFFFFF" />
      </svg>
    );
  }

  // 7. SCSS / SASS (.scss, .sass)
  if (ext === 'scss' || ext === 'sass') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#CC6699" />
        <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif">SASS</text>
      </svg>
    );
  }

  // 8. C++ (.cpp, .cc, .cxx, .hpp)
  if (['cpp', 'cc', 'cxx', 'hpp', 'c++'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#00599C" />
        <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif">C++</text>
      </svg>
    );
  }

  // 9. C (.c, .h)
  if (ext === 'c' || ext === 'h') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#A8B9CC" />
        <text x="12" y="17" textAnchor="middle" fill="#002D5B" fontSize="12" fontWeight="900" fontFamily="sans-serif">C</text>
      </svg>
    );
  }

  // 10. Rust (.rs)
  if (ext === 'rs') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#CE412B" />
        <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" />
        <path d="M10 9h3a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-3v-4zm0 4h2.5l2 3h-2l-1.7-2.7H10V16h-2V9h4" fill="white" />
      </svg>
    );
  }

  // 11. Go (.go)
  if (ext === 'go') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#00ADD8" />
        <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="900" fontFamily="sans-serif">GO</text>
      </svg>
    );
  }

  // 12. Java (.java, .jar)
  if (ext === 'java' || ext === 'jar') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#5382A1" />
        <path d="M8 15c2 1 6 1 8 0M7 17c3 1.5 7 1.5 10 0M10 7c-.5 1.5 1 2.5 1 3.5M13 5c-1 2 1.5 3 1.5 4.5" stroke="#F89820" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 13. SQL (.sql, .db, .sqlite)
  if (ext === 'sql' || ext === 'db' || ext === 'sqlite') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#E48E00" />
        <ellipse cx="12" cy="8" rx="6" ry="2.5" fill="#FFFFFF" />
        <path d="M6 8v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V8" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
        <path d="M6 12v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }

  // 14. JSON (.json)
  if (ext === 'json') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#F59E0B" />
        <text x="12" y="16" textAnchor="middle" fill="#000000" fontSize="12" fontWeight="900" fontFamily="monospace">{`{ }`}</text>
      </svg>
    );
  }

  // 15. Markdown (.md, .markdown)
  if (ext === 'md' || ext === 'markdown') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#0891B2" />
        <path d="M5 8v8l3-3.5L11 16V8M14 12l2.5-2.5L19 12M16.5 9.5V16" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 16. Shell / Bash (.sh, .bash, .zsh, .ps1, .bat, .cmd)
  if (['sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#1F2937" stroke="#4B5563" strokeWidth="1" />
        <path d="M6 8l4 4-4 4M12 16h6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 17. Images (.png, .jpg, .jpeg, .svg, .webp, .gif, .ico)
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'ico'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#8B5CF6" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="white" />
        <path d="M5 17l4-5 3 4 4-6 4 7H5z" fill="white" />
      </svg>
    );
  }

  // 18. YAML / TOML (.yaml, .yml, .toml)
  if (['yaml', 'yml', 'toml'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#CB171E" />
        <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="sans-serif">YML</text>
      </svg>
    );
  }

  // 19. ZIP / Archives (.zip, .tar, .gz, .rar, .7z)
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#D97706" />
        <path d="M12 4v16M10 6h4M10 10h4M10 14h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 20. Default Document Icon
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#374151" stroke="#6B7280" strokeWidth="1.5" />
      <path d="M14 3v5h5" stroke="#6B7280" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};
