function App(): JSX.Element {
  const sendFileToService = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files) {
      return
    }
    const audioFile = event.target.files[0]
    const audioFileArrayBuffer = await audioFile.arrayBuffer()
    const byteArray = new Uint8Array(audioFileArrayBuffer)

    await window.api.voiceFileUpload(byteArray) // TODO: Change to two-way communication and return transcribed text
  }

  return (
    <>
      <label htmlFor="voice-upload">Upload Voice File</label>
      <input id="voice-upload" type="file" onChange={sendFileToService} />
    </>
  )
}

export default App
