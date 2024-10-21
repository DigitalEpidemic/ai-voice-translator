import { useState } from 'react'
import WavEncoder from 'wav-encoder'

function App(): JSX.Element {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isStartButtonDisabled, setStartButtonDisabled] = useState(false)
  const [isStopButtonDisabled, setStopButtonDisabled] = useState(true)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>()
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])

  const sendFileToService = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files) {
      return
    }
    const audioFile = event.target.files[0]
    const audioFileArrayBuffer = await audioFile.arrayBuffer()
    const byteArray = new Uint8Array(audioFileArrayBuffer)

    const fileBlob = new Blob([byteArray], { type: 'audio/wav' })
    const blobUrl = URL.createObjectURL(fileBlob)
    setAudioUrl(blobUrl)

    await window.api.voiceFileUpload(byteArray) // TODO: Change to two-way communication and return transcribed text
  }

  const handleStartRecording = async (): Promise<void> => {
    if (audioUrl) {
      setAudioUrl(null)
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
        // Send the audio data to the main process to save the file
        window.api.saveAudio(wavBuffer, 'recording.wav')

        // Play the audio locally
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioUrl(audioUrl)
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
    console.log(mediaRecorder)
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

  return (
    <>
      <label htmlFor="voice-upload">Upload Voice File</label>
      <input id="voice-upload" type="file" accept="audio/*" onChange={sendFileToService} />

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

      {audioUrl && (
        <div>
          <audio controls>
            <source src={audioUrl} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </>
  )
}

export default App
