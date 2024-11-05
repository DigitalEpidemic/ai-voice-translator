import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  voiceFileUpload: (byteArray: Uint8Array): Promise<string> =>
    ipcRenderer.invoke('voiceFileUpload', byteArray),
  translateTranscription: (text: string, language: string): Promise<string> =>
    ipcRenderer.invoke('translateTranscription', text, language),
  textToSpeech: (text: string, voiceId: string): Promise<void> =>
    ipcRenderer.invoke('textToSpeech', text, voiceId)
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
