import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PhantomAI 2.0 - Next-Gen AI Assistant & Dev Suite',
  description:
    'Advanced ChatGPT-style AI conversation engine, multi-language sandbox compiler, real-time audio voice synthesis, image generation, and system architecture monitor.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cyber-dark text-slate-100 antialiased min-h-screen theme-dark">
        {children}
      </body>
    </html>
  );
}
