import { AvailableLanguageCodes, languages } from '@/types/languageTypes'
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Select,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text
} from '@chakra-ui/react'
import React, { useState } from 'react'
import WavEncoder from 'wav-encoder'
import { FileUploadButton } from './components/ui/FileUpload'

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
  const [outputLanguage, setOutputLanguage] = useState<AvailableLanguageCodes>(languages[0].code)
  const [tabIndex, setTabIndex] = useState(0)

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
        window.api.saveAudio(wavBuffer)

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
    const currentLanguage = languages.find((language) => language.code === outputLanguage)
    if (!translatedText || !currentLanguage) {
      return
    }

    const arrayBuffer = await window.api.textToSpeech(translatedText, currentLanguage.name)
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    setTranslatedAudioUrl(url)
  }

  const handleOnLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    console.log('Setting output language to:', event.target.value)
    setOutputLanguage(event.target.value as AvailableLanguageCodes)
  }

  return (
    <Tabs onChange={(index) => setTabIndex(index)} isFitted variant="enclosed-colored" w={'100vw'}>
      <Heading size="lg" my={2} textAlign={'center'}>
        AI Voice Translator
      </Heading>
      <TabList mb="1em">
        <Tab>Speech-To-Speech</Tab>
        <Tab>Translate File</Tab>
        <Tab>Text-to-Speech</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <Stack maxW={'500px'} mx="auto">
            <Text>Record Microphone:</Text>
            <HStack w={'100%'} justifyContent={'center'}>
              <Button
                flexGrow={1}
                onClick={handleStartRecording}
                isDisabled={isStartButtonDisabled}
              >
                Start Recording
              </Button>
              <Button flexGrow={1} onClick={handleStopRecording} isDisabled={isStopButtonDisabled}>
                Stop Recording
              </Button>
            </HStack>
          </Stack>
        </TabPanel>
        <TabPanel>
          <Stack maxW={'500px'} mx="auto">
            <Text>Upload Existing Audio File:</Text>
            <FileUploadButton buttonText="Upload File" onChange={handleAudioFileUpload} />
          </Stack>
        </TabPanel>
        <TabPanel>
          <Stack maxW={'500px'} mx="auto">
            <Text>Not yet implemented 😢</Text>
          </Stack>
        </TabPanel>
      </TabPanels>

      <Stack maxW={'500px'} mx="auto">
        {tabIndex !== 2 && (
          <>
            <Box mb={4}>
              <audio controls style={{ width: '100%' }}>
                {originalAudioUrl && <source src={originalAudioUrl} type="audio/wav" />}
                Your browser does not support the audio element.
              </audio>
            </Box>
            <Button onClick={transcribeAudioInArrayBuffer}>Transcribe</Button>
            <Text>{transcription}</Text>
          </>
        )}

        <Flex>
          <Select
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
          </Select>
          <Button w={'100%'} onClick={handleTranslatingText}>
            Translate
          </Button>
        </Flex>
        <Text>{translatedText}</Text>

        <Stack mt={4}>
          <Button onClick={handleTextToSpeech}>Use AI Voice 🤖</Button>
          <Text>Translated Audio:</Text>
          <audio controls style={{ width: '100%' }}>
            {translatedAudioUrl && <source src={translatedAudioUrl} type="audio/mp3" />}
            Your browser does not support the audio element.
          </audio>
        </Stack>
      </Stack>
    </Tabs>
  )
}

export default App
