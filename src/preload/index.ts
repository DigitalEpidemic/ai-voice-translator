import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  transcribeAudio: (byteArray: Uint8Array): Promise<string> =>
    ipcRenderer.invoke('transcribe-audio', byteArray),
  saveAudio: (audioBuffer: Buffer, filename: string): void =>
    ipcRenderer.send('save-audio', audioBuffer, filename),
  translateText: (text: string): Promise<string> => ipcRenderer.invoke('translate-text', text)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
