/**
 * Phantom AI - Voice & Speech Synthesis Utility
 * Provides intelligent default Male voice selection, priority sorting, and masculine pitch tuning.
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
  voices: SpeechSynthesisVoice[],
  language = 'en-US'
): SpeechSynthesisVoice | undefined {
  if (!voices || voices.length === 0) return undefined;

  const langCode = (language || 'en-US').split('-')[0].toLowerCase();

  // Filter voices matching current language or English
  const matchingLangVoices = voices.filter(
    (v) => v.lang.toLowerCase().startsWith(langCode) || v.lang.toLowerCase().startsWith('en')
  );

  const pool = matchingLangVoices.length > 0 ? matchingLangVoices : voices;

  // 1. Natural / Neural / Online Male Voices in matching language (Highest Quality - Edge/Chrome)
  const premiumMale = pool.find(
    (v) =>
      isMaleVoice(v) &&
      (v.name.includes('Natural') ||
        v.name.includes('Neural') ||
        v.name.includes('Online') ||
        v.name.includes('Google'))
  );
  if (premiumMale) return premiumMale;

  // 2. Standard Male Voice in matching language (e.g., Microsoft David, Alex, Daniel)
  const standardMale = pool.find((v) => isMaleVoice(v));
  if (standardMale) return standardMale;

  // 3. Any Male Voice across all installed system voices
  const globalMale = voices.find((v) => isMaleVoice(v));
  if (globalMale) return globalMale;

  // 4. Fallback: Preferred voice in language
  return pool[0] || voices[0];
}

/**
 * Applies optimal male voice configuration & pitch settings to an utterance
 */
export function applyMaleVoiceSettings(
  utterance: SpeechSynthesisUtterance,
  voices: SpeechSynthesisVoice[],
  userVoicePreference?: string,
  language = 'en-US'
): void {
  utterance.lang = language || 'en-US';
  utterance.rate = 1.02;

  // User explicitly selected a custom voice
  if (userVoicePreference && userVoicePreference.trim() && voices.length > 0) {
    const custom = voices.find((v) => v.name === userVoicePreference);
    if (custom) {
      utterance.voice = custom;
      utterance.pitch = isMaleVoice(custom) ? 0.95 : 1.0;
      return;
    }
  }

  // Default to best male voice
  const defaultMale = findBestMaleVoice(voices, language);
  if (defaultMale) {
    utterance.voice = defaultMale;
    utterance.pitch = isMaleVoice(defaultMale) ? 0.95 : 0.88;
  } else {
    utterance.pitch = 0.88;
  }
}
