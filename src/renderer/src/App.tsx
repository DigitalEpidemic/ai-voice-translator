import { languages } from '@/types/languageTypes'
import { useState } from 'react'

function App(): JSX.Element {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioTranscript, setAudioTranscript] = useState<string | null>(null)
  const [translation, setTranslation] = useState<string | null>(null)
  const [language, setLanguage] = useState<string>('ja')
  const [voiceId, setVoiceId] = useState<string>('LHEmo0XNW9f1ptZLyVTV')

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

    const transcription = await window.api.voiceFileUpload(byteArray)
    setAudioTranscript(transcription)

    const taco = await window.api.translateTranscription(transcription, language)
    setTranslation(taco)

    await window.api.textToSpeech(taco, voiceId)

    // TODO: Move translation into main index.tsx (Create event, etc.)
    // setTranslation(await doTheTranslation(transcription, language))
    console.log(transcription)
  }

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    console.log(event.target.value)
    setLanguage(event.target.value)
  }

  const handleVoiceIdChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setVoiceId(event.target.value)
  }

  return (
    <>
      <label htmlFor="voice-upload">Upload Voice File</label>
      <input id="voice-upload" type="file" accept="audio/*" onChange={sendFileToService} />

      <select onChange={handleLanguageChange}>
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
      {audioUrl && (
        <div>
          <audio controls>
            <source src={audioUrl} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {audioTranscript && <p>Original: {audioTranscript}</p>}
      {translation && <p>Translation: {translation}</p>}

      <select onChange={handleVoiceIdChange}>
        <option value="LHEmo0XNW9f1ptZLyVTV">Jeff</option>
      </select>
    </>
  )
}

export default App
