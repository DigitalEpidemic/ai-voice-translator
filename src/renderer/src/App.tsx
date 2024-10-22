import { useState } from 'react'

function App(): JSX.Element {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

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

    const response = await window.api.voiceFileUpload(byteArray)
    console.log(response)
  }

  return (
    <>
      <label htmlFor="voice-upload">Upload Voice File</label>
      <input id="voice-upload" type="file" accept="audio/*" onChange={sendFileToService} />

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
