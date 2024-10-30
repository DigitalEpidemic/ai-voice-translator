import { ElectronAPI } from '@electron-toolkit/preload'
import { AvailableLanguages } from '../types/languageTypes'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      transcribeAudio: (byteArray: Uint8Array) => Promise<string>
      saveAudio: (audioBuffer: Uint8Array, filename: string) => void
      translateText: (text: string, targetLanguage: AvailableLanguages) => Promise<string>
      textToSpeech: (text: string) => Promise<Uint8Array>
    }
  }
}
