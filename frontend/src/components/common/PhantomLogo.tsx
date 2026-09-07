import React from 'react';

interface PhantomLogoProps {
  variant?: 'icon' | 'horizontal' | 'hero' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
  glow?: boolean;
  animated?: boolean;
}

/**
 * 100% Mathematically Exact Vector SVG matching `final phantom logo.png`:
 * - Pointed outer hexagon
 * - Top isometric diamond face
 * - Center vertical spine extending to bottom vertex
 * - Left and right stylized ribbon loops with symmetrical inward gaps
 * - Dynamically adapts: pitch black in light mode, crisp white in dark mode.
 */
export const PhantomIconSvg: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-6 h-6',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* 1. Outer Hexagon */}
      <path
        d="M 50 8.5 L 87.5 30 L 87.5 70 L 50 91.5 L 12.5 70 L 12.5 30 Z"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      {/* 2. Top Diamond Face of Cube */}
      <path
        d="M 50 25.5 L 72.5 38.5 L 50 50.5 L 27.5 38.5 Z"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      {/* 3. Center Vertical Spine */}
      <path
        d="M 50 50.5 L 50 91.5"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="square"
      />
      {/* 4. Left Stylized Ribbon Arm */}
      <path
        d="M 27.5 38.5 L 27.5 63 L 42.5 71.5"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      {/* 5. Right Stylized Ribbon Arm */}
      <path
        d="M 72.5 38.5 L 72.5 63 L 57.5 71.5"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    </svg>
  );
};

export const PhantomLogo: React.FC<PhantomLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showBadge = true,
  className = '',
  glow = true,
  animated = false,
}) => {
  const sizeMap = {
    xs: { icon: 'w-4 h-4', container: 'w-6 h-6 rounded-md', text: 'text-xs', badge: 'text-[9px] px-1' },
    sm: { icon: 'w-5 h-5', container: 'w-8 h-8 rounded-lg', text: 'text-sm', badge: 'text-[9px] px-1.5 py-0.5' },
    md: { icon: 'w-6 h-6', container: 'w-9 h-9 rounded-xl', text: 'text-base', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { icon: 'w-8 h-8', container: 'w-12 h-12 rounded-2xl', text: 'text-xl', badge: 'text-xs px-2 py-0.5' },
    xl: { icon: 'w-12 h-12', container: 'w-20 h-20 rounded-3xl', text: 'text-3xl', badge: 'text-sm px-2.5 py-1' },
  };

  const currentSize = sizeMap[size];

  // 1. Standalone Icon Variant (Adaptive: dark logo in light theme, light logo in dark theme)
  if (variant === 'icon') {
    return (
      <div
        className={`relative inline-flex items-center justify-center p-0.5 rounded-xl transition-all duration-300 ${
          glow ? 'shadow-mono-glow' : ''
        } ${animated ? 'hover:scale-105 active:scale-95' : ''} ${className}`}
      >
        <div className="w-full h-full bg-zinc-100 text-black dark:bg-black dark:text-white rounded-[10px] p-1.5 flex items-center justify-center border border-zinc-300 dark:border-zinc-800 transition-colors">
          <PhantomIconSvg className={`${currentSize.icon} text-black dark:text-white`} />
        </div>
      </div>
    );
  }

  // 2. Hero Splash Variant
  if (variant === 'hero') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        <div className="relative mb-6 group">
          {/* Ambient Glow Aura */}
          {glow && (
            <div className="absolute -inset-4 bg-zinc-400/20 dark:bg-white/10 rounded-full blur-2xl -z-10 group-hover:bg-zinc-400/30 dark:group-hover:bg-white/20 transition-all duration-500" />
          )}

          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 p-3 flex items-center justify-center shadow-xl transition-transform duration-300 hover:scale-105 ${
              animated ? 'animate-pulse-slow' : ''
            }`}
          >
            <PhantomIconSvg className="w-14 h-14 sm:w-16 sm:h-16 text-black dark:text-white transition-colors" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            PhantomAI
          </h1>
          {showBadge && (
            <span className="text-xs font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-sm">
              2.0
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. Compact Badge Variant
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors ${className}`}
      >
        <PhantomIconSvg className="w-3.5 h-3.5 text-black dark:text-white" />
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">PhantomAI</span>
        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
          2.0
        </span>
      </div>
    );
  }

  // 4. Default: Horizontal Full Brand Logo (Theme-Adaptive: dark logo in light mode, light logo in dark mode)
  return (
    <div
      className={`flex items-center gap-2.5 select-none transition-all ${
        animated ? 'hover:opacity-90' : ''
      } ${className}`}
    >
      <div
        className={`${currentSize.container} bg-zinc-100 text-black dark:bg-black dark:text-white p-1 rounded-xl flex items-center justify-center border border-zinc-300 dark:border-zinc-800 shadow-mono-subtle flex-shrink-0 transition-colors`}
      >
        <PhantomIconSvg className={`${currentSize.icon} text-black dark:text-white`} />
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={`font-bold tracking-tight text-zinc-900 dark:text-white ${currentSize.text}`}
        >
          PhantomAI
        </span>
        {showBadge && (
          <span
            className={`font-mono font-semibold uppercase tracking-wider rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 ${currentSize.badge}`}
          >
            2.0
          </span>
        )}
      </div>
    </div>
  );
};
