import { AvailableLanguageCodes, AvailableLanguages, languages } from '@/types/languageTypes'
import { createClient } from '@deepgram/sdk'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { AssemblyAI } from 'assemblyai'
import dotenv from 'dotenv'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { ElevenLabsClient } from 'elevenlabs'
import { GetSpeechHistoryResponse } from 'elevenlabs/api'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path, { join } from 'path'
import { Readable } from 'stream'
import translate from 'translate'
import icon from '../../resources/icon.png?asset'

dotenv.config()

const deepgramClient = createClient(process.env.VITE_DEEPGRAM_API_KEY)

const assemblyAIClient = new AssemblyAI({
  apiKey: process.env.VITE_ASSEMBLYAI_API_KEY as string
})

const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.VITE_ELEVENLABS_API_KEY as string
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: 'AI Voice Translator',
    width: 750,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('page-title-updated', function (e) {
    e.preventDefault()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS, it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle(
  'transcribe-audio',
  async (_, uint8Array: Uint8Array, inputLanguage: AvailableLanguageCodes): Promise<string> => {
    console.log('Input language:', inputLanguage)

    const transcriber = languages.find((language) => language.code === inputLanguage)?.transcriber
    console.log('Transcriber:', transcriber)

    try {
      console.log('Transcribing audio...')

      if (transcriber === 'deepgram') {
        const audioBuffer = Buffer.from(uint8Array)
        const response = await deepgramClient.listen.prerecorded.transcribeFile(audioBuffer, {
          punctuate: true,
          language: inputLanguage,
          model: 'nova-2'
        })

        if (response.result && response.result.results.channels.length > 0) {
          const transcription = response.result.results.channels[0].alternatives[0]?.transcript
          console.log(` ${transcription}`)
          return transcription
        } else {
          console.error('No transcription available in response:', response)
        }
      } else if (transcriber === 'assemblyai') {
        const transcription = await assemblyAIClient.transcripts.transcribe({
          audio: uint8Array,
          speech_model: 'nano',
          language_code: inputLanguage,
          punctuate: false
        })
        console.log('Transcription:', transcription.text)
        return transcription.text ?? ''
      }
    } catch (error) {
      console.error('Error transcribing audio:', error)
    }
    return ''
  }
)

ipcMain.on('save-audio', async (_, wavBuffer: Uint8Array) => {
  const fileName = `recording-${await generateUUID()}.wav`
  const filePath = getAudioDirectoryWithFileName('Recorded', fileName)

  saveAudioBufferToFilePath(filePath, wavBuffer)
})

ipcMain.handle('save-audio-url', async (_, url: string): Promise<Uint8Array> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch audio file: ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  const fileName = `url-${await generateUUID()}.wav`
  const filePath = getAudioDirectoryWithFileName('URL', fileName)

  saveAudioBufferToFilePath(filePath, uint8Array)

  return uint8Array
})

ipcMain.handle(
  'translate-text',
  async (
    _,
    text: string,
    outputLanguage: AvailableLanguageCodes,
    inputLanguage: AvailableLanguageCodes
  ): Promise<string> => {
    const fullOutputLanguageName = languages.find(
      (language) => language.code === outputLanguage
    )?.name
    const fullInputLanguageName = languages.find(
      (language) => language.code === inputLanguage
    )?.name
    console.log(`Translating text into ${fullOutputLanguageName} from ${fullInputLanguageName}...`)
    translate.engine = 'google'

    try {
      const result = await translate(text, { to: outputLanguage, from: inputLanguage })
      console.log(` ${result}`)
      return result
    } catch (e) {
      console.log(e)
      return 'Error translating text'
    }
  }
)

ipcMain.handle(
  'text-to-speech',
  async (_, text: string, language: AvailableLanguages): Promise<Uint8Array> => {
    console.log('Generating audio...')
    const defaultVoiceId = 'bIHbv24MWmeRgasZH58o' // Premade voice for Will

    try {
      const audioStream = await elevenLabsClient.generate({
        voice: process.env.VITE_ELEVENLABS_VOICE_ID ?? defaultVoiceId, // TODO: Get endpoint and list all voices in a dropdown
        model_id: 'eleven_turbo_v2_5',
        text
      })

      const generatedFileName = await generateUUID()
      const tempMp3FilePath = getAudioDirectoryWithFileName(
        'Generated',
        `${language}-${generatedFileName}.mp3`
      )

      const audioData = await saveAudioStreamToMp3FileAndReturnAudioData(
        audioStream,
        tempMp3FilePath
      )

      const wavFilePath = getAudioDirectoryWithFileName(
        'Generated',
        `${language}-${generatedFileName}.wav`
      )
      await convertMp3ToWav(tempMp3FilePath, wavFilePath)

      fs.unlink(tempMp3FilePath, (err) => {
        if (err) {
          console.error('Failed to delete temp MP3 file:', err)
        }
      })

      return audioData
    } catch (error) {
      console.error('Error generating audio:', error)
      throw new Error('Audio generation failed')
    }
  }
)

ipcMain.handle('get-history', async (): Promise<GetSpeechHistoryResponse | null> => {
  try {
    console.log('Fetching history...')
    const history = await elevenLabsClient.history.getAll()
    return history
  } catch (error) {
    console.error('Error getting history:', error)
    return null
  }
})

ipcMain.handle('download-history-audio', async (_, historyId: string, saveFile: boolean = true) => {
  console.log('Downloading history audio...')
  try {
    const audioStream = await elevenLabsClient.history.getAudio(historyId)
    const intArray = await readableStreamToUint8Array(audioStream)

    if (saveFile) {
      const tempMp3FilePath = getAudioDirectoryWithFileName(
        'Downloaded',
        `download-${historyId}.mp3`
      )
      saveAudioBufferToFilePath(tempMp3FilePath, intArray)

      const wavFilePath = getAudioDirectoryWithFileName('Downloaded', `download-${historyId}.wav`)
      await convertMp3ToWav(tempMp3FilePath, wavFilePath)

      fs.unlink(tempMp3FilePath, (err) => {
        if (err) {
          console.error('Failed to delete temp MP3 file:', err)
        }
      })
    }

    return intArray
  } catch (error) {
    console.log('Error downloading history audio:', error)
    throw new Error('Downloading history audio failed')
  }
})

const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

const saveAudioBufferToFilePath = (filePath: string, buffer: Uint8Array): void => {
  const dir = path.dirname(filePath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`Directory created: ${dir}`)
  }

  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      console.error('Failed to save audio file:', err)
    } else {
      console.log('Audio saved to:', filePath)
    }
  })
}

const saveAudioStreamToMp3FileAndReturnAudioData = async (
  audioStream: Readable,
  tempMp3FilePath: string
): Promise<Uint8Array> => {
  const intArray = await readableStreamToUint8Array(audioStream)
  saveAudioBufferToFilePath(tempMp3FilePath, intArray)

  return intArray
}

const readableStreamToUint8Array = async (readableStream: Readable): Promise<Uint8Array> => {
  const stream = Readable.from(readableStream)
  const buffer = await streamToBuffer(stream)
  return new Uint8Array(buffer)
}

const convertMp3ToWav = async (tempFilePath: string, wavFilePath: string): Promise<void> => {
  return await new Promise<void>((resolve, reject) => {
    ffmpeg(tempFilePath)
      .toFormat('wav')
      .on('end', () => {
        console.log('Audio saved as WAV:', wavFilePath)
        resolve()
      })
      .on('error', (err) => {
        reject(err)
      })
      .save(wavFilePath)
  })
}

const getAudioDirectoryWithFileName = (directoryName: string, fileName: string): string => {
  const appDirectory = app.getAppPath()
  const audioDirectory = path.join(appDirectory, 'Audio Files')
  const nestedDirectory = path.join(audioDirectory, directoryName)
  const filePath = path.join(nestedDirectory, fileName)
  return filePath
}

const generateUUID = async (): Promise<string> => {
  const { nanoid } = await import('nanoid')
  return nanoid()
}
