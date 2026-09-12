/**
 * Phantom AI - Voice & Speech Synthesis Utility
 * Provides intelligent default Male voice selection, priority sorting,
 * text sanitization for speech engines, and masculine pitch tuning.
 */

const MALE_VOICE_NAMES = [
  // High-quality Microsoft Edge Natural / Online Male Voices
  'ryan', 'guy', 'christopher', 'eric', 'andrew', 'brian', 'steffan', 'roger', 'richard', 'sean', 'george', 'james', 'oliver',
  // Windows SAPI & Desktop Male Voices
  'david', 'mark', 'cosimo', 'claude', 'raul',
  // Google / Chrome Male Voices
  'google uk english male', 'english male', 'en-us-x-sfg#male',
  'wavenet-b', 'wavenet-d', 'wavenet-j', 'standard-b', 'standard-d', 'standard-j', 'neural2-d', 'neural2-j',
  'en-gb-wavenet-b', 'en-gb-wavenet-d', 'en-in-wavenet-b',
  // Apple / macOS / iOS Male Voices
  'alex', 'daniel', 'fred', 'oliver', 'arthur', 'gordon', 'aaron', 'rishi', 'thomas', 'tom', 'lee', 'jorge', 'juan', 'diego'
];

const FEMALE_EXCLUSIONS = [
  'female', 'woman', 'girl', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'fiona', 'veena',
  'tessa', 'hazel', 'susan', 'heera', 'eva', 'jenny', 'aria', 'sonia', 'natasha', 'libby', 'clara',
  'mia', 'ana', 'elena', 'catherine', 'linda', 'lisa', 'sarah', 'mary'
];

let emojiPictoRegex: RegExp | null = null;
let emojiPresRegex: RegExp | null = null;
const EMOJI_FALLBACK_REGEX = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\uFE00-\uFE0F]|[\u200D\u20E3]/g;

try {
  emojiPictoRegex = new RegExp('\\p{Extended_Pictographic}', 'gu');
  emojiPresRegex = new RegExp('\\p{Emoji_Presentation}', 'gu');
} catch {}

/**
 * Strips all emojis, code blocks, URLs, and markdown tokens from a string
 * so Web Speech API / SAPI5 speech synthesis engines can pronounce it cleanly
 * without crashing or throwing 'synthesis-failed' errors.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  let cleaned = text
    // 1. Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // 2. Remove inline code ticks
    .replace(/`([^`]+)`/g, '$1')
    // 3. Remove Markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 4. Remove raw URLs
    .replace(/https?:\/\/\S+/g, ' ');

  // 5. Remove Unicode emojis
  if (emojiPictoRegex) {
    try {
      cleaned = cleaned.replace(emojiPictoRegex, '');
    } catch {}
  }
  if (emojiPresRegex) {
    try {
      cleaned = cleaned.replace(emojiPresRegex, '');
    } catch {}
  }
  cleaned = cleaned.replace(EMOJI_FALLBACK_REGEX, '');

  return cleaned
    // 6. Remove Markdown and special formatting symbols (*, _, #, ~, >, |, {, }, [, ], ^, etc.)
    .replace(/[*#_~>|{}[\]\\^]/g, ' ')
    // 7. Normalize consecutive whitespace and newlines to a single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits arbitrary length text / long documents into natural, sentence-sized chunks (max ~160 chars)
 * so browser SpeechSynthesis engines (Chromium, WebKit, Gecko) never drop, stall, or crash on long text.
 */
export function splitTextIntoSpeechChunks(text: string, maxChunkLen = 160): string[] {
  if (!text) return [];
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];

  // 1. Split on sentence boundaries (. ! ? ;) or colon or newlines
  const rawSentences = cleaned.split(/(?<=[.?!;:\n])\s+/);
  const chunks: string[] = [];

  for (const sentence of rawSentences) {
    const s = sentence.trim();
    if (!s) continue;

    if (s.length <= maxChunkLen) {
      chunks.push(s);
    } else {
      // 2. Split large sentence by commas or natural pauses
      const subParts = s.split(/(?<=[,])\s+/);
      let currentChunk = '';

      for (const part of subParts) {
        if ((currentChunk + ' ' + part).trim().length <= maxChunkLen) {
          currentChunk = (currentChunk ? currentChunk + ' ' : '') + part;
        } else {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          if (part.length <= maxChunkLen) {
            currentChunk = part;
          } else {
            // 3. Fallback: split long phrase by words
            const words = part.split(/\s+/);
            let wordChunk = '';
            for (const word of words) {
              if ((wordChunk + ' ' + word).trim().length <= maxChunkLen) {
                wordChunk = (wordChunk ? wordChunk + ' ' : '') + word;
              } else {
                if (wordChunk.trim()) chunks.push(wordChunk.trim());
                wordChunk = word;
              }
            }
            currentChunk = wordChunk;
          }
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    }
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Maps a display language name or code to a standard BCP 47 language tag
 */
export function mapLanguageToCode(lang?: string): string {
  if (!lang) return 'en-US';
  const l = lang.toLowerCase().trim();
  if (l.includes('spanish') || l.startsWith('es')) return 'es-ES';
  if (l.includes('french') || l.startsWith('fr')) return 'fr-FR';
  if (l.includes('german') || l.startsWith('de')) return 'de-DE';
  if (l.includes('hindi') || l.startsWith('hi')) return 'hi-IN';
  if (l.includes('chinese') || l.startsWith('zh')) return 'zh-CN';
  if (l.includes('japanese') || l.startsWith('ja')) return 'ja-JP';
  if (l.includes('russian') || l.startsWith('ru')) return 'ru-RU';
  if (l.includes('portuguese') || l.startsWith('pt')) return 'pt-BR';
  if (l.includes('italian') || l.startsWith('it')) return 'it-IT';
  if (l.includes('arabic') || l.startsWith('ar')) return 'ar-SA';
  if (l.includes('korean') || l.startsWith('ko')) return 'ko-KR';
  if (l.includes('dutch') || l.startsWith('nl')) return 'nl-NL';
  if (l.includes('turkish') || l.startsWith('tr')) return 'tr-TR';
  if (l.includes('polish') || l.startsWith('pl')) return 'pl-PL';
  if (l.includes('swedish') || l.startsWith('sv')) return 'sv-SE';
  return 'en-US';
}

/**
 * Asynchronously loads system voices, handling browser initialization delay
 */
export function getSystemVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const current = window.speechSynthesis.getVoices();
    if (current && current.length > 0) {
      resolve(current);
      return;
    }
    let resolved = false;
    const handleVoicesChanged = () => {
      if (resolved) return;
      resolved = true;
      resolve(window.speechSynthesis.getVoices() || []);
    };
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(window.speechSynthesis.getVoices() || []);
      }
    }, 500);
  });
}

/**
 * Checks if a given SpeechSynthesisVoice is categorized as male
 */
export function isMaleVoice(voice: SpeechSynthesisVoice): boolean {
  if (!voice || !voice.name) return false;
  const name = voice.name.toLowerCase();

  // Exclude known female signatures
  for (const fem of FEMALE_EXCLUSIONS) {
    if (name.includes(fem)) return false;
  }

  // Explicit male tags
  if (name.includes('male') || name.includes(' guy') || name.includes('(male)') || name.includes(' man ') || name.includes('boy')) {
    return true;
  }

  // Known masculine voice names
  for (const m of MALE_VOICE_NAMES) {
    if (name.includes(m)) return true;
  }

  return false;
}

/**
 * Checks if a given SpeechSynthesisVoice is categorized as female
 */
export function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  if (!voice || !voice.name) return false;
  const name = voice.name.toLowerCase();

  // Known female matches
  for (const fem of FEMALE_EXCLUSIONS) {
    if (name.includes(fem)) return true;
  }
  if (name.includes('female') || name.includes(' woman ') || name.includes('girl') || name.includes('(female)')) {
    return true;
  }

  return !isMaleVoice(voice);
}

/**
 * Finds the highest quality default male voice available in the current browser/OS
 */
export function findBestMaleVoice(
  voices?: SpeechSynthesisVoice[],
  language = 'en-US'
): SpeechSynthesisVoice | undefined {
  let pool = voices;
  if (!pool || pool.length === 0) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      pool = window.speechSynthesis.getVoices();
    }
  }
  if (!pool || pool.length === 0) return undefined;

  const langTag = mapLanguageToCode(language);
  const langCode = langTag.split('-')[0].toLowerCase();

  const matchingLangVoices = pool.filter(
    (v) => v.lang.toLowerCase().startsWith(langCode) || v.lang.toLowerCase().startsWith('en')
  );

  const candidatePool = matchingLangVoices.length > 0 ? matchingLangVoices : pool;

  // 1. Natural / Neural / Online Male Voices in matching language (Edge/Chrome)
  const premiumMale = candidatePool.find(
    (v) =>
      isMaleVoice(v) &&
      (v.name.includes('Natural') ||
        v.name.includes('Neural') ||
        v.name.includes('Online') ||
        v.name.includes('Google'))
  );
  if (premiumMale) return premiumMale;

  // 2. Standard Male Voice in matching language (David, Alex, Daniel)
  const standardMale = candidatePool.find((v) => isMaleVoice(v));
  if (standardMale) return standardMale;

  // 3. Any Male Voice across all installed system voices
  const globalMale = pool.find((v) => isMaleVoice(v));
  if (globalMale) return globalMale;

  return candidatePool[0] || pool[0];
}

/**
 * Finds the highest quality default female voice available in the current browser/OS
 */
export function findBestFemaleVoice(
  voices?: SpeechSynthesisVoice[],
  language = 'en-US'
): SpeechSynthesisVoice | undefined {
  let pool = voices;
  if (!pool || pool.length === 0) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      pool = window.speechSynthesis.getVoices();
    }
  }
  if (!pool || pool.length === 0) return undefined;

  const langTag = mapLanguageToCode(language);
  const langCode = langTag.split('-')[0].toLowerCase();

  const matchingLangVoices = pool.filter(
    (v) => v.lang.toLowerCase().startsWith(langCode) || v.lang.toLowerCase().startsWith('en')
  );

  const candidatePool = matchingLangVoices.length > 0 ? matchingLangVoices : pool;

  // 1. Natural / Neural / Online Female Voices (Jenny, Aria, Google Female)
  const premiumFemale = candidatePool.find(
    (v) =>
      isFemaleVoice(v) &&
      (v.name.includes('Natural') ||
        v.name.includes('Neural') ||
        v.name.includes('Online') ||
        v.name.includes('Google'))
  );
  if (premiumFemale) return premiumFemale;

  // 2. Standard Female Voice (Zira, Samantha, Victoria)
  const standardFemale = candidatePool.find((v) => isFemaleVoice(v));
  if (standardFemale) return standardFemale;

  const globalFemale = pool.find((v) => isFemaleVoice(v));
  if (globalFemale) return globalFemale;

  return candidatePool[0] || pool[0];
}

export interface CuratedVoiceItem {
  id: string;
  name: string;
  voiceName: string;
  gender: 'male' | 'female';
  accent: string;
  persona: string;
  badge: 'Natural Neural' | 'Studio HD' | 'Classic Clear';
  basePitch: number;
}

export interface CuratedVoiceCatalog {
  topMale: CuratedVoiceItem[];
  topFemale: CuratedVoiceItem[];
}

/**
 * Extracts and curates exactly the Top 5 Best Male voices and Top 5 Best Female voices
 * from the browser/OS speech synthesis system, with calibrated personas and fallback profiles.
 */
export function getCuratedTopVoices(
  voices?: SpeechSynthesisVoice[],
  language = 'en-US'
): CuratedVoiceCatalog {
  let pool = voices;
  if (!pool || pool.length === 0) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      pool = window.speechSynthesis.getVoices();
    }
  }
  const allVoices = pool || [];

  // Filter available system voices
  const maleVoices = allVoices.filter((v) => isMaleVoice(v));
  const femaleVoices = allVoices.filter((v) => isFemaleVoice(v));

  // Sort by Natural / Online > Desktop > Standard
  const sortQuality = (list: SpeechSynthesisVoice[]) =>
    [...list].sort((a, b) => {
      const aScore = (a.name.includes('Natural') ? 4 : 0) + (a.name.includes('Online') ? 2 : 0) + (a.name.includes('Google') ? 3 : 0);
      const bScore = (b.name.includes('Natural') ? 4 : 0) + (b.name.includes('Online') ? 2 : 0) + (b.name.includes('Google') ? 3 : 0);
      return bScore - aScore;
    });

  const sortedMale = sortQuality(maleVoices);
  const sortedFemale = sortQuality(femaleVoices);

  const bestMale = findBestMaleVoice(allVoices, language);
  const bestFemale = findBestFemaleVoice(allVoices, language);

  // Curate Top 5 Male Personas
  const topMale: CuratedVoiceItem[] = [
    {
      id: 'male-1',
      name: 'Orion',
      voiceName: sortedMale[0]?.name || bestMale?.name || 'Default Male',
      gender: 'male',
      accent: 'US / Global Studio',
      persona: 'Authoritative, deep, ultra-clear neural studio voice',
      badge: sortedMale[0]?.name.includes('Natural') ? 'Natural Neural' : 'Studio HD',
      basePitch: 0.92,
    },
    {
      id: 'male-2',
      name: 'Atlas',
      voiceName: sortedMale[1]?.name || sortedMale[0]?.name || bestMale?.name || 'Default Male',
      gender: 'male',
      accent: 'US Tech Dynamic',
      persona: 'Crisp, articulate developer cadence and modern tone',
      badge: sortedMale[1]?.name.includes('Natural') ? 'Natural Neural' : 'Studio HD',
      basePitch: 0.98,
    },
    {
      id: 'male-3',
      name: 'Echo',
      voiceName: sortedMale[2]?.name || sortedMale[0]?.name || bestMale?.name || 'Default Male',
      gender: 'male',
      accent: 'Warm Baritone',
      persona: 'Calming, resonant, soothing conversational bass',
      badge: 'Studio HD',
      basePitch: 0.86,
    },
    {
      id: 'male-4',
      name: 'Sterling',
      voiceName:
        sortedMale.find((v) => v.lang.toLowerCase().includes('gb') || v.name.toLowerCase().includes('uk'))?.name ||
        sortedMale[3]?.name ||
        sortedMale[0]?.name ||
        bestMale?.name ||
        'Default Male',
      gender: 'male',
      accent: 'British Eloquent',
      persona: 'Refined, polished, intellectual UK narrative cadence',
      badge: 'Natural Neural',
      basePitch: 0.94,
    },
    {
      id: 'male-5',
      name: 'Vortex',
      voiceName: sortedMale[4]?.name || sortedMale[1]?.name || bestMale?.name || 'Default Male',
      gender: 'male',
      accent: 'Dynamic Turbo',
      persona: 'High-energy, focused, rapid executive synthesizer',
      badge: 'Classic Clear',
      basePitch: 1.02,
    },
  ];

  // Curate Top 5 Female Personas
  const topFemale: CuratedVoiceItem[] = [
    {
      id: 'female-1',
      name: 'Nova',
      voiceName: sortedFemale[0]?.name || bestFemale?.name || 'Default Female',
      gender: 'female',
      accent: 'US / Global Studio',
      persona: 'Warm, natural, empathetic neural studio voice',
      badge: sortedFemale[0]?.name.includes('Natural') ? 'Natural Neural' : 'Studio HD',
      basePitch: 1.0,
    },
    {
      id: 'female-2',
      name: 'Serena',
      voiceName: sortedFemale[1]?.name || sortedFemale[0]?.name || bestFemale?.name || 'Default Female',
      gender: 'female',
      accent: 'Crisp Executive',
      persona: 'Confident, clear, articulate professional tone',
      badge: sortedFemale[1]?.name.includes('Natural') ? 'Natural Neural' : 'Studio HD',
      basePitch: 1.05,
    },
    {
      id: 'female-3',
      name: 'Lyra',
      voiceName: sortedFemale[2]?.name || sortedFemale[0]?.name || bestFemale?.name || 'Default Female',
      gender: 'female',
      accent: 'Bright Melodic',
      persona: 'Lively, friendly, cheerful conversational assistant',
      badge: 'Studio HD',
      basePitch: 1.12,
    },
    {
      id: 'female-4',
      name: 'Athena',
      voiceName:
        sortedFemale.find((v) => v.lang.toLowerCase().includes('gb') || v.name.toLowerCase().includes('uk'))?.name ||
        sortedFemale[3]?.name ||
        sortedFemale[0]?.name ||
        bestFemale?.name ||
        'Default Female',
      gender: 'female',
      accent: 'British Refined',
      persona: 'Sophisticated, elegant, articulate UK narrative cadence',
      badge: 'Natural Neural',
      basePitch: 0.98,
    },
    {
      id: 'female-5',
      name: 'Horizon',
      voiceName: sortedFemale[4]?.name || sortedFemale[1]?.name || bestFemale?.name || 'Default Female',
      gender: 'female',
      accent: 'Gentle Ambient',
      persona: 'Soothing, gentle, relaxed meditation and storytelling',
      badge: 'Classic Clear',
      basePitch: 0.92,
    },
  ];

  return { topMale, topFemale };
}

/**
 * Applies custom voice, speed rate, and pitch settings to a SpeechSynthesisUtterance
 */
export function applyVoiceCustomSettings(
  utterance: SpeechSynthesisUtterance,
  voices?: SpeechSynthesisVoice[],
  userVoicePreference?: string,
  language = 'en-US',
  speechRate = 1.0,
  speechPitch = 1.0
): void {
  const langTag = mapLanguageToCode(language);
  utterance.lang = langTag;
  
  // Apply bounded rate (0.5x to 2.0x)
  const safeRate = Math.max(0.5, Math.min(2.0, Number(speechRate) || 1.0));
  utterance.rate = safeRate;

  // Base pitch modifier
  const safePitch = Math.max(0.5, Math.min(1.5, Number(speechPitch) || 1.0));

  let voiceList = voices;
  if (!voiceList || voiceList.length === 0) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      voiceList = window.speechSynthesis.getVoices();
    }
  }

  // 1. Check curated personas or explicit voice name
  const catalog = getCuratedTopVoices(voiceList, language);
  const allCurated = [...catalog.topMale, ...catalog.topFemale];
  const matchedCurated = allCurated.find(
    (c) => c.name.toLowerCase() === (userVoicePreference || '').toLowerCase() || c.id === userVoicePreference
  );

  if (matchedCurated && voiceList && voiceList.length > 0) {
    const directVoice = voiceList.find((v) => v.name === matchedCurated.voiceName);
    if (directVoice) {
      utterance.voice = directVoice;
      utterance.pitch = Math.max(0.5, Math.min(1.5, safePitch * matchedCurated.basePitch));
      return;
    }
  }

  // 2. Direct voice name match
  if (userVoicePreference && userVoicePreference.trim() && voiceList && voiceList.length > 0) {
    const custom = voiceList.find((v) => v.name.toLowerCase() === userVoicePreference.toLowerCase());
    if (custom) {
      utterance.voice = custom;
      const genderBase = isMaleVoice(custom) ? 0.95 : 1.02;
      utterance.pitch = Math.max(0.5, Math.min(1.5, safePitch * genderBase));
      return;
    }
  }

  // 3. Default to Best Male Voice
  const defaultMale = findBestMaleVoice(voiceList, language);
  if (defaultMale) {
    utterance.voice = defaultMale;
    utterance.pitch = Math.max(0.5, Math.min(1.5, safePitch * 0.92));
  } else {
    utterance.pitch = safePitch;
  }
}

/**
 * Backward compatibility wrapper
 */
export function applyMaleVoiceSettings(
  utterance: SpeechSynthesisUtterance,
  voices?: SpeechSynthesisVoice[],
  userVoicePreference?: string,
  language = 'en-US'
): void {
  applyVoiceCustomSettings(utterance, voices, userVoicePreference, language, 1.0, 1.0);
}
