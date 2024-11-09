import { AvailableLanguageCodes, AvailableLanguages } from '@/types/languageTypes'
import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import { GetSpeechHistoryResponse } from 'elevenlabs/api'

// Custom APIs for renderer
const api = {
  transcribeAudio: (
    byteArray: Uint8Array,
    inputLanguage: AvailableLanguageCodes
  ): Promise<string> => ipcRenderer.invoke('transcribe-audio', byteArray, inputLanguage),
  saveAudio: (audioBuffer: Buffer): void => ipcRenderer.send('save-audio', audioBuffer),
  translateText: (
    text: string,
    outputLanguage: AvailableLanguageCodes,
    inputLanguage: AvailableLanguageCodes
  ): Promise<string> => ipcRenderer.invoke('translate-text', text, outputLanguage, inputLanguage),
  textToSpeech: (text: string, language: AvailableLanguages): Promise<Uint8Array> =>
    ipcRenderer.invoke('text-to-speech', text, language),
  saveAudioURL: (url: string): Promise<Uint8Array> => ipcRenderer.invoke('save-audio-url', url),
  getHistory: (): Promise<GetSpeechHistoryResponse | null> => ipcRenderer.invoke('get-history')
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
