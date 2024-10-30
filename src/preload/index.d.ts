import { ElectronAPI } from '@electron-toolkit/preload'

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
