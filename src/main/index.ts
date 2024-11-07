import { createClient } from '@deepgram/sdk'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import dotenv from 'dotenv'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { ElevenLabsClient } from 'elevenlabs'
import fs from 'fs'
import path, { join } from 'path'
import { Readable } from 'stream'
import translate from 'translate'
import { v4 as uuid } from 'uuid'
import icon from '../../resources/icon.png?asset'
import ffmpeg from 'fluent-ffmpeg'
import { AvailableLanguageCodes, AvailableLanguages, languages } from '@/types/languageTypes'

dotenv.config()

const deepgramClient = createClient(process.env.VITE_DEEPGRAM_API_KEY)

const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.VITE_ELEVENLABS_API_KEY as string
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: 'AI Voice Translator',
    width: 900,
    height: 675,
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

ipcMain.handle('transcribe-audio', async (_, uint8Array: Uint8Array): Promise<string> => {
  console.log('Transcribing audio...')

  try {
    const audioBuffer = Buffer.from(uint8Array)

    const response = await deepgramClient.listen.prerecorded.transcribeFile(audioBuffer, {
      punctuate: true,
      language: 'en-US',
      model: 'nova-2'
    })

    if (response.result && response.result.results.channels.length > 0) {
      const transcription = response.result.results.channels[0].alternatives[0]?.transcript
      console.log('Transcription:', transcription)
      return transcription
    } else {
      console.error('No transcription available in response:', response)
    }
  } catch (error) {
    console.error('Error transcribing audio:', error)
  }
  return ''
})

ipcMain.on('save-audio', (_, wavBuffer: Uint8Array) => {
  const filename = `recording-${uuid()}.wav`
  const appDirectory = app.getAppPath() // Get the current app directory
  const filePath = path.join(appDirectory, filename) // Specify the file path

  saveAudioBufferToFilePath(filePath, wavBuffer)
})

ipcMain.handle(
  'translate-text',
  async (_, text: string, targetLanguage: AvailableLanguageCodes): Promise<string> => {
    const fullLanguageName = languages.find((language) => language.code === targetLanguage)?.name
    console.log(`Translating text into ${fullLanguageName}...`)
    translate.engine = 'google'

    try {
      const result = await translate(text, { to: targetLanguage })
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

    try {
      const audioStream = await elevenLabsClient.generate({
        voice: 'LHEmo0XNW9f1ptZLyVTV', // My voice ID
        model_id: 'eleven_turbo_v2_5',
        text
      })

      const generatedFileName = uuid()
      const appDirectory = app.getAppPath()

      const tempMp3FilePath = path.join(appDirectory, `${language}-${generatedFileName}.mp3`)
      const audioData = await saveAudioStreamToMp3FileAndReturnAudioData(
        audioStream,
        tempMp3FilePath
      )

      const wavFilePath = path.join(appDirectory, `${language}-${generatedFileName}.wav`)
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

const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

const saveAudioBufferToFilePath = (filePath: string, buffer: Uint8Array): void => {
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
  const readableStream = Readable.from(audioStream)
  const buffer = await streamToBuffer(readableStream)
  const intArray = new Uint8Array(buffer)

  saveAudioBufferToFilePath(tempMp3FilePath, intArray)
  return intArray
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
