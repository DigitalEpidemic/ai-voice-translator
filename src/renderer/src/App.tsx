// import { AssemblyAI } from 'assemblyai'

function App(): JSX.Element {
  // const client = new AssemblyAI({
  // })

  const sendFileToService = async (event): Promise<void> => {
    const audioFile = event.target.files[0]

    console.log(audioFile)
    await window.electronAPI.voiceFileUpload(audioFile)

    // const params = {
    //   audio: audioFile,
    //   speaker_labels: true
    // }

    // const transcript = await client.transcripts.transcribe(params)
    // console.log(transcript)
  }

  return (
    <>
      <label htmlFor="voice-upload">Upload Voice File</label>
      <input id="voice-upload" type="file" onChange={sendFileToService} />
    </>
  )
}

export default App
