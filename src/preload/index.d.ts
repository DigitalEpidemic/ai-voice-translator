import { ElectronAPI } from '@electron-toolkit/preload'
import { AvailableLanguageCodes, AvailableLanguages } from '../types/languageTypes'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      transcribeAudio: (
        byteArray: Uint8Array,
        inputLanguage: AvailableLanguageCodes
      ) => Promise<string>
      saveAudio: (audioBuffer: Uint8Array) => void
      translateText: (
        text: string,
        outputLanguage: AvailableLanguageCodes,
        inputLanguage: AvailableLanguageCodes
      ) => Promise<string>
      textToSpeech: (text: string, language: AvailableLanguages) => Promise<Uint8Array>
      saveAudioURL: (url: string) => Promise<Uint8Array>
    }
  }
}
