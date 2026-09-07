import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  Wand2,
  RefreshCw,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ImageGenResult } from '@/types';

interface ImageStudioProps {
  onBackToChat?: () => void;
}

export const ImageStudio: React.FC<ImageStudioProps> = ({ onBackToChat }) => {
  const [prompt, setPrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('Photorealistic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<ImageGenResult | null>(null);
  const [gallery, setGallery] = useState<ImageGenResult[]>([]);
  const [copied, setCopied] = useState(false);

  const stylePresets = [
    { id: 'Photorealistic', label: '8K Photorealistic', suffix: 'highly detailed 8k photorealistic lighting cinematic masterpiece high contrast monochrome' },
    { id: 'Minimalist', label: 'Minimalist Architecture', suffix: 'minimalist brutalist black and white architectural photography dramatic shadows clean lines' },
    { id: 'Concept', label: 'Monochrome Concept Art', suffix: 'ink illustration concept art detailed charcoal sketching dramatic chiaroscuro' },
    { id: 'Cinematic', label: 'Cinematic Film Noir', suffix: '35mm anamorphic black and white film still dramatic atmospheric high contrast' },
    { id: '3D', label: '3D Raytraced', suffix: 'octane render 3d raytracing smooth metallic reflections studio lighting 8k' },
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    const selectedStyle = stylePresets.find((s) => s.id === stylePreset);
    const finalPrompt = selectedStyle ? `${prompt.trim()}, ${selectedStyle.suffix}` : prompt.trim();

    try {
      const result = await api.generateImage(finalPrompt);
      setCurrentImage(result);
      setGallery((prev) => [result, ...prev]);
    } catch (err: any) {
      alert(err.message || 'Image generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-black select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToChat && (
              <button
                onClick={onBackToChat}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all mr-2 group shadow-mono-subtle"
                title="Return to AI Assistant Chat"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="font-medium">AI Chat</span>
              </button>
            )}
            <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-mono-subtle">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                AI Image Generation Studio
              </h2>
              <p className="text-xs text-zinc-400">
                Powered by FLUX.1 & Pollinations rendering engine
              </p>
            </div>
          </div>
        </div>

        {/* Studio Generator Card */}
        <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-mono-card space-y-4">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to create in vivid detail..."
                rows={3}
                className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white shadow-inner resize-none"
              />
            </div>

            {/* Style Selector Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1">
                <Wand2 className="w-3.5 h-3.5 text-white" />
                <span>Style:</span>
              </span>
              {stylePresets.map((style) => (
                <button
                  type="button"
                  key={style.id}
                  onClick={() => setStylePreset(style.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    stylePreset === style.id
                      ? 'bg-white text-black font-semibold shadow-mono-subtle'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>

            {/* Generate Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  prompt.trim() && !isGenerating
                    ? 'bg-white hover:bg-zinc-200 text-black shadow-mono-glow active:scale-95'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Synthesizing Image...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Generate Artwork</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Current Image Display */}
        {currentImage && (
          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-mono-card space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white" />
                <span>Render Result</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyPrompt(currentImage.enhanced_prompt)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
                </button>
                <a
                  href={currentImage.image_url}
                  download="phantom_ai_artwork.png"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black border border-white text-xs font-bold transition-all shadow-mono-subtle"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center min-h-[350px]">
              <img
                src={currentImage.image_url}
                alt={currentImage.original_prompt}
                className="max-h-[600px] w-full object-contain rounded-2xl"
              />
            </div>

            <div className="p-3 rounded-xl bg-black border border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Enhanced Prompt
              </span>
              <p className="text-xs text-zinc-300 mt-1 italic">{currentImage.enhanced_prompt}</p>
            </div>
          </div>
        )}

        {/* Gallery of Session Images */}
        {gallery.length > 1 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
              Recent Studio Generations
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gallery.slice(1).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentImage(item)}
                  className="group relative rounded-xl overflow-hidden aspect-square border border-zinc-800 bg-zinc-900 cursor-pointer hover:border-white transition-all"
                >
                  <img
                    src={item.image_url}
                    alt={item.original_prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                    <p className="text-[11px] text-white font-medium truncate">{item.original_prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

