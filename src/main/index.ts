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

dotenv.config()

const deepgramClient = createClient(process.env.VITE_DEEPGRAM_API_KEY)

const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.VITE_ELEVENLABS_API_KEY as string
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
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
    // On macOS it's common to re-create a window in the app when the
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

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

// on File Upload, send it to AssemblyAI
ipcMain.handle('transcribe-audio', async (_, uint8Array: Uint8Array): Promise<string> => {
  console.log('Transcribing audio...')

  try {
    const audioBuffer = Buffer.from(uint8Array)

    const response = await deepgramClient.listen.prerecorded.transcribeFile(audioBuffer, {
      punctuate: true,
      language: 'en-US',
      model: 'nova-2'
    })

    // Check if response has results
    if (response.result && response.result.results.channels.length > 0) {
      // Access the transcription text
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

// Listen for the 'save-audio' event
ipcMain.on('save-audio', (_, wavBuffer: Uint8Array, filename: string) => {
  const appDirectory = app.getAppPath() // Get the current app directory
  const filePath = path.join(appDirectory, filename) // Specify the file path

  fs.writeFile(filePath, wavBuffer, (err) => {
    if (err) {
      console.error('Failed to save audio file:', err)
    } else {
      console.log('Audio saved to:', filePath)
    }
  })
})

ipcMain.handle('translate-text', async (_, text: string): Promise<string> => {
  console.log('Translating text...')
  translate.engine = 'google'

  try {
    const result = await translate(text, { to: 'tl' })
    console.log(` ${result}`)
    return result
  } catch (e) {
    console.log(e)
    return 'Error translating text'
  }
})

ipcMain.handle('text-to-speech', async (_, text: string): Promise<Uint8Array> => {
  console.log('Generating audio...')

  try {
    const audioStream = await elevenLabsClient.generate({
      voice: 'LHEmo0XNW9f1ptZLyVTV', // My voice ID
      model_id: 'eleven_turbo_v2_5',
      text
    })

    const readableStream = Readable.from(audioStream)
    const buffer = await streamToBuffer(readableStream)
    const intArray = new Uint8Array(buffer)

    const generatedFileName = uuid()
    const tempFileName = `${generatedFileName}.mp3`
    const appDirectory = app.getAppPath()
    const tempFilePath = path.join(appDirectory, tempFileName)

    fs.writeFileSync(tempFilePath, buffer)

    const wavFileName = `${generatedFileName}.wav`
    const wavFilePath = path.join(appDirectory, wavFileName)

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempFilePath)
        .toFormat('wav')
        .on('end', () => {
          resolve()
        })
        .on('error', (err) => {
          reject(err)
        })
        .save(wavFilePath)
    })

    fs.unlink(tempFilePath, (err) => {
      if (err) {
        console.error('Failed to delete temp MP3 file:', err)
      }
    })

    console.log('Audio saved as WAV:', wavFilePath)
    return intArray
  } catch (error) {
    console.error('Error generating audio:', error)
    throw new Error('Audio generation failed')
  }
})

// Helper function to convert stream to buffer
const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
