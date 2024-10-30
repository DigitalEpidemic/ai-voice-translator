import React, { useState } from 'react'
import WavEncoder from 'wav-encoder'
import { AvailableLanguages, languages } from '@/types/languageTypes'

const App = (): React.ReactElement => {
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null)
  const [translatedAudioUrl, setTranslatedAudioUrl] = useState<string | null>(null)
  const [isStartButtonDisabled, setStartButtonDisabled] = useState(false)
  const [isStopButtonDisabled, setStopButtonDisabled] = useState(true)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>()
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [audioFileArrayBuffer, setAudioFileArrayBuffer] = useState<Uint8Array>()
  const [transcription, setTranscription] = useState<string>('')
  const [translatedText, setTranslatedText] = useState<string>('')
  const [outputLanguage, setOutputLanguage] = useState<AvailableLanguages>(languages[0].code)

  const handleAudioFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    if (!event.target.files) {
      return
    }
    setOriginalAudioUrl(null)

    const audioFile = event.target.files[0]
    const audioFileArrayBuffer = await audioFile.arrayBuffer()
    const byteArray = new Uint8Array(audioFileArrayBuffer)
    setAudioFileArrayBuffer(byteArray)

    const fileBlob = new Blob([byteArray], { type: 'audio/wav' })
    const blobUrl = URL.createObjectURL(fileBlob)
    setOriginalAudioUrl(blobUrl)
  }

  const handleStartRecording = async (): Promise<void> => {
    if (originalAudioUrl) {
      setOriginalAudioUrl(null)
    }

    try {
      // This should return a valid MediaStream object
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })

      // Now pass the MediaStream to MediaRecorder
      const mr = new MediaRecorder(stream)
      setMediaRecorder(mr)

      mr.ondataavailable = (event: BlobEvent): void => {
        audioChunks.push(event.data)
      }

      mr.onstop = async (): Promise<void> => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

        const wavBuffer = await convertWebMToWav(audioBlob)
        setAudioFileArrayBuffer(wavBuffer)
        // Send the audio data to the main process to save the file
        window.api.saveAudio(wavBuffer, 'recording.wav')

        // Play the audio locally
        const audioUrl = URL.createObjectURL(audioBlob)
        setOriginalAudioUrl(audioUrl)
        setAudioChunks([])
      }

      mr.start()
      setStartButtonDisabled(true)
      setStopButtonDisabled(false)

      return Promise.resolve()
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const handleStopRecording = (): void => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setStartButtonDisabled(false)
      setStopButtonDisabled(true)
    }
  }

  const convertWebMToWav = async (webmBlob: Blob): Promise<Uint8Array> => {
    const arrayBuffer = await webmBlob.arrayBuffer()

    // Create an AudioContext instance (available in the renderer process)
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Convert audioBuffer to WAV using wav-encoder
    const wavData = await WavEncoder.encode({
      sampleRate: audioBuffer.sampleRate,
      channelData: [audioBuffer.getChannelData(0)] // Assuming mono audio
    })

    return new Uint8Array(wavData)
  }

  const transcribeAudioInArrayBuffer = async (): Promise<void> => {
    if (!audioFileArrayBuffer) {
      return
    }

    const transcribedAudio = await window.api.transcribeAudio(audioFileArrayBuffer)
    setTranscription(transcribedAudio)
  }

  const handleTranslatingText = async (): Promise<void> => {
    if (!transcription) {
      return
    }

    const result = await window.api.translateText(transcription, outputLanguage)
    setTranslatedText(result)
  }

  const handleTextToSpeech = async (): Promise<void> => {
    if (!translatedText) {
      return
    }

    const arrayBuffer = await window.api.textToSpeech(translatedText)
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    setTranslatedAudioUrl(url)
  }

  const handleOnLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    console.log('Setting output language to:', event.target.value)
    setOutputLanguage(event.target.value as AvailableLanguages)
  }

  return (
    <>
      <label htmlFor="voice-upload">Upload Voice File</label>
      <input id="voice-upload" type="file" accept="audio/*" onChange={handleAudioFileUpload} />

      <p>Or</p>

      <label htmlFor="voice-upload">Record Microphone</label>
      <div>
        <button onClick={handleStartRecording} disabled={isStartButtonDisabled}>
          Start Recording
        </button>
        <button onClick={handleStopRecording} disabled={isStopButtonDisabled}>
          Stop Recording
        </button>
      </div>

      {originalAudioUrl && (
        <div>
          <audio controls>
            <source src={originalAudioUrl} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
          <div>
            <button onClick={transcribeAudioInArrayBuffer}>Transcribe</button>
            <p>{transcription}</p>
            <button onClick={handleTranslatingText}>Translate</button>
            <select
              name="languages"
              id="languages"
              onChange={handleOnLanguageChange}
              value={outputLanguage}
            >
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
            <p>{translatedText}</p>
          </div>

          <div>
            <button onClick={handleTextToSpeech}>Use AI Voice 🤖</button>
            {translatedAudioUrl && (
              <audio controls>
                <source src={translatedAudioUrl} type="audio/mp3" />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default App
