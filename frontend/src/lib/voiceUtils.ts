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

  // Filter voices matching current language or English
  const matchingLangVoices = pool.filter(
    (v) => v.lang.toLowerCase().startsWith(langCode) || v.lang.toLowerCase().startsWith('en')
  );

  const candidatePool = matchingLangVoices.length > 0 ? matchingLangVoices : pool;

  // 1. Natural / Neural / Online Male Voices in matching language (Highest Quality - Edge/Chrome)
  const premiumMale = candidatePool.find(
    (v) =>
      isMaleVoice(v) &&
      (v.name.includes('Natural') ||
        v.name.includes('Neural') ||
        v.name.includes('Online') ||
        v.name.includes('Google'))
  );
  if (premiumMale) return premiumMale;

  // 2. Standard Male Voice in matching language (e.g., Microsoft David, Alex, Daniel)
  const standardMale = candidatePool.find((v) => isMaleVoice(v));
  if (standardMale) return standardMale;

  // 3. Any Male Voice across all installed system voices
  const globalMale = pool.find((v) => isMaleVoice(v));
  if (globalMale) return globalMale;

  // 4. Fallback: Preferred voice in language
  return candidatePool[0] || pool[0];
}

/**
 * Applies optimal male voice configuration & pitch settings to an utterance
 */
export function applyMaleVoiceSettings(
  utterance: SpeechSynthesisUtterance,
  voices?: SpeechSynthesisVoice[],
  userVoicePreference?: string,
  language = 'en-US'
): void {
  const langTag = mapLanguageToCode(language);
  utterance.lang = langTag;
  utterance.rate = 1.0;

  let voiceList = voices;
  if (!voiceList || voiceList.length === 0) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      voiceList = window.speechSynthesis.getVoices();
    }
  }

  // User explicitly selected a custom voice
  if (userVoicePreference && userVoicePreference.trim() && voiceList && voiceList.length > 0) {
    const custom = voiceList.find((v) => v.name === userVoicePreference);
    if (custom) {
      utterance.voice = custom;
      utterance.pitch = isMaleVoice(custom) ? 0.95 : 1.0;
      return;
    }
  }

  // Default to best male voice
  const defaultMale = findBestMaleVoice(voiceList, language);
  if (defaultMale) {
    utterance.voice = defaultMale;
    utterance.pitch = isMaleVoice(defaultMale) ? 0.95 : 0.88;
  } else {
    utterance.pitch = 0.88;
  }
}
