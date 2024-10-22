import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      voiceFileUpload: (byteArray: Uint8Array) => Promise<string>
    }
  }
}
