import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      transcribeAudio: (byteArray: Uint8Array) => Promise<void>
      saveAudio: (audioBuffer: Uint8Array, filename: string) => void
    }
  }
}
