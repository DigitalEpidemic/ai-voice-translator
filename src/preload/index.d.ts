import { ElectronAPI } from '@electron-toolkit/preload'
import { AvailableLanguageCodes, AvailableLanguages } from '../types/languageTypes'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      transcribeAudio: (byteArray: Uint8Array) => Promise<string>
      saveAudio: (audioBuffer: Uint8Array) => void
      translateText: (text: string, targetLanguage: AvailableLanguageCodes) => Promise<string>
      textToSpeech: (text: string, language: AvailableLanguages) => Promise<Uint8Array>
    }
  }
}
