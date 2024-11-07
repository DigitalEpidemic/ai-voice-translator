export const languages = [
  { name: 'Tagalog', code: 'tl', transcriber: 'assemblyai' },
  { name: 'Japanese', code: 'ja', transcriber: 'deepgram' },
  { name: 'German', code: 'de', transcriber: 'deepgram' },
  { name: 'Polish', code: 'pl', transcriber: 'deepgram' },
  { name: 'Chinese', code: 'zh', transcriber: 'deepgram' },
  { name: 'Vietnamese', code: 'vi', transcriber: 'deepgram' },
  { name: 'English', code: 'en', transcriber: 'deepgram' },
  { name: 'Hindi', code: 'hi', transcriber: 'deepgram' },
  { name: 'French', code: 'fr', transcriber: 'deepgram' },
  { name: 'Korean', code: 'ko', transcriber: 'deepgram' },
  { name: 'Portuguese', code: 'pt', transcriber: 'deepgram' },
  { name: 'Italian', code: 'it', transcriber: 'deepgram' },
  { name: 'Spanish', code: 'es', transcriber: 'deepgram' },
  { name: 'Indonesian', code: 'id', transcriber: 'deepgram' },
  { name: 'Dutch', code: 'nl', transcriber: 'deepgram' },
  { name: 'Turkish', code: 'tr', transcriber: 'deepgram' },
  { name: 'Swedish', code: 'sv', transcriber: 'deepgram' },
  { name: 'Bulgarian', code: 'bg', transcriber: 'deepgram' },
  { name: 'Romanian', code: 'ro', transcriber: 'deepgram' },
  { name: 'Arabic', code: 'ar', transcriber: 'assemblyai' },
  { name: 'Czech', code: 'cs', transcriber: 'deepgram' },
  { name: 'Greek', code: 'el', transcriber: 'deepgram' },
  { name: 'Finnish', code: 'fi', transcriber: 'deepgram' },
  { name: 'Croatian', code: 'hr', transcriber: 'assemblyai' },
  { name: 'Malay', code: 'ms', transcriber: 'deepgram' },
  { name: 'Slovak', code: 'sk', transcriber: 'deepgram' },
  { name: 'Danish', code: 'da', transcriber: 'deepgram' },
  { name: 'Tamil', code: 'ta', transcriber: 'assemblyai' },
  { name: 'Ukrainian', code: 'uk', transcriber: 'deepgram' },
  { name: 'Russian', code: 'ru', transcriber: 'deepgram' },
  { name: 'Hungarian', code: 'hu', transcriber: 'deepgram' },
  { name: 'Norwegian', code: 'no', transcriber: 'deepgram' }
] as const

export type AvailableLanguageCodes = (typeof languages)[number]['code']
export type AvailableLanguages = (typeof languages)[number]['name']
export type AvailableLanguageTranscribers = (typeof languages)[number]['transcriber']
