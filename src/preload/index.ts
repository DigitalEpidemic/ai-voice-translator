import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { AvailableLanguages } from '@/types/languageTypes'

// Custom APIs for renderer
const api = {
  transcribeAudio: (byteArray: Uint8Array): Promise<string> =>
    ipcRenderer.invoke('transcribe-audio', byteArray),
  saveAudio: (audioBuffer: Buffer, filename: string): void =>
    ipcRenderer.send('save-audio', audioBuffer, filename),
  translateText: (text: string, targetLanguage: AvailableLanguages): Promise<string> =>
    ipcRenderer.invoke('translate-text', text, targetLanguage),
  textToSpeech: (text: string): Promise<Uint8Array> => ipcRenderer.invoke('text-to-speech', text)
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
