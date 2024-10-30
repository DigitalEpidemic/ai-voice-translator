import { ElectronAPI } from '@electron-toolkit/preload'
import { AvailableLanguages, languages } from '../types/languageTypes'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      voiceFileUpload: (byteArray: Uint8Array) => Promise<string>
      translateTranscription: (text: string, language: string) => Promise<string>
      textToSpeech: (text: string) => Promise<void>
    }
  }
}
