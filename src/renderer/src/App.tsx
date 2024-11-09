import { AvailableLanguageCodes, languages } from '@/types/languageTypes'
import {
  Box,
  Button,
  Flex,
  FormLabel,
  Heading,
  HStack,
  Input,
  Stack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea
} from '@chakra-ui/react'
import { GetSpeechHistoryResponse } from 'elevenlabs/api'
import React, { useEffect, useState } from 'react'
import { MdHistory } from 'react-icons/md'
import WavEncoder from 'wav-encoder'
import { AudioPlayer } from './components/AudioPlayer'
import { FileUploadButton } from './components/FileUpload'
import { HistoryItemList } from './components/HistoryItem'
import { LanguageDropdown } from './components/LanguageDropdown'
import { LanguageDropdowns } from './components/LanguageDropdowns'

const WINDOW_WIDTH = 750
const WINDOW_HEIGHT = 670
const WINDOW_HEIGHT_DEBUG_MODE = 825
const MAX_CONTENT_WIDTH = '550px'
const TAB_INDEXES = {
  SpeechToText: 0,
  TranslateFile: 1,
  TranslateURL: 2,
  TextToSpeech: 3,
  History: 4
}
const TAGALOG_LANGUAGE = languages[0]
const ENGLISH_LANGUAGE = languages[6]

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
  const [outputLanguage, setOutputLanguage] = useState<AvailableLanguageCodes>(
    TAGALOG_LANGUAGE.code
  )
  const [tabIndex, setTabIndex] = useState(TAB_INDEXES.SpeechToText)
  const [userEnteredText, setUserEnteredText] = useState('')
  const [debugMode, setDebugMode] = useState(false)
  const [inputLanguage, setInputLanguage] = useState<AvailableLanguageCodes>(ENGLISH_LANGUAGE.code)
  const [userEnteredURL, setUserEnteredURL] = useState('')
  const [historyList, setHistoryList] = useState<GetSpeechHistoryResponse | null>(null)

  const isTextToSpeechTabActive = tabIndex === TAB_INDEXES.TextToSpeech
  const isHistoryTabActive = tabIndex === TAB_INDEXES.History

  useEffect(() => {
    if (!isHistoryTabActive || historyList) {
      return
    }

    const fetchHistoryList = async (): Promise<void> => {
      console.log('Fetching history useEffect...')
      const history = await window.api.getHistory()
      setHistoryList(history)
    }
    fetchHistoryList()
  }, [tabIndex])

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

    if (!debugMode) {
      const transcribedAudio = await transcribeAudioInArrayBuffer(byteArray)
      const translation = await handleTranslatingText(transcribedAudio)
      await handleTextToSpeech(translation)
    }
  }

  const handleStartRecording = async (): Promise<void> => {
    if (originalAudioUrl) {
      setOriginalAudioUrl(null)
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })

      const mr = new MediaRecorder(stream)
      setMediaRecorder(mr)

      mr.ondataavailable = (event: BlobEvent): void => {
        audioChunks.push(event.data)
      }

      mr.onstop = async (): Promise<void> => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

        const wavBuffer = await convertWebMToWav(audioBlob)
        setAudioFileArrayBuffer(wavBuffer)
        window.api.saveAudio(wavBuffer)

        const audioUrl = URL.createObjectURL(audioBlob)
        setOriginalAudioUrl(audioUrl)
        setAudioChunks([])

        if (!debugMode) {
          const transcribedAudio = await transcribeAudioInArrayBuffer(wavBuffer)
          const translated = await handleTranslatingText(transcribedAudio)
          await handleTextToSpeech(translated)
        }
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

    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const wavData = await WavEncoder.encode({
      sampleRate: audioBuffer.sampleRate,
      channelData: [audioBuffer.getChannelData(0)]
    })

    return new Uint8Array(wavData)
  }

  const transcribeAudioInArrayBuffer = async (
    arrayBufferOverride?: Uint8Array,
    languageOverride?: AvailableLanguageCodes
  ): Promise<string> => {
    const arrayBuffer = arrayBufferOverride ?? audioFileArrayBuffer
    const language = languageOverride ?? inputLanguage
    if (!arrayBuffer || !language) {
      return ''
    }

    const transcribedAudio = await window.api.transcribeAudio(arrayBuffer, language)
    setTranscription(transcribedAudio)
    return transcribedAudio
  }

  const handleTranslatingText = async (transcriptionOverride?: string): Promise<string> => {
    const generatedTranscription = transcriptionOverride ?? transcription
    const textToTranslate = isTextToSpeechTabActive ? userEnteredText : generatedTranscription
    if (!textToTranslate) {
      return ''
    }

    const translation = await window.api.translateText(
      textToTranslate,
      outputLanguage,
      inputLanguage
    )
    setTranslatedText(translation)

    if (isTextToSpeechTabActive && !debugMode) {
      await handleTextToSpeech(translation)
    }

    return translation
  }

  const handleTextToSpeech = async (textOverride?: string): Promise<void> => {
    const textToGenerate = textOverride ?? translatedText

    const currentLanguage = languages.find((language) => language.code === outputLanguage)
    if (!textToGenerate || !currentLanguage) {
      return
    }

    const arrayBuffer = await window.api.textToSpeech(textToGenerate, currentLanguage.name)
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    setTranslatedAudioUrl(url)
  }

  const handleOnInputLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    console.log('Setting input language to:', event.target.value)
    setInputLanguage(event.target.value as AvailableLanguageCodes)
  }

  const handleOnOutputLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    console.log('Setting output language to:', event.target.value)
    setOutputLanguage(event.target.value as AvailableLanguageCodes)
  }

  const handleOnDebugModeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    console.log('Setting debug mode to:', event.target.checked)
    setDebugMode(event.target.checked)

    window.resizeTo(WINDOW_WIDTH, event.target.checked ? WINDOW_HEIGHT_DEBUG_MODE : WINDOW_HEIGHT)
  }

  const handleOnTabChange = (index: number): void => {
    setTabIndex(index)

    setTranslatedText('')
    setTranslatedAudioUrl(null)
    setTranscription('')
    setUserEnteredText('')
    setAudioFileArrayBuffer(undefined)
    setOriginalAudioUrl(null)
  }

  const handleURLSubmission = async (): Promise<void> => {
    if (!userEnteredURL) {
      return
    }

    const byteArray = await window.api.saveAudioURL(userEnteredURL)
    setAudioFileArrayBuffer(byteArray)
    const fileBlob = new Blob([byteArray], { type: 'audio/wav' })
    const blobUrl = URL.createObjectURL(fileBlob)
    setOriginalAudioUrl(blobUrl)

    if (!debugMode) {
      const transcribedAudio = await transcribeAudioInArrayBuffer(byteArray)
      const translation = await handleTranslatingText(transcribedAudio)
      await handleTextToSpeech(translation)
    }
  }

  const renderLanguageDropdowns = (): JSX.Element => {
    return debugMode ? (
      <LanguageDropdown
        label={'Input Language'}
        value={inputLanguage}
        onChange={handleOnInputLanguageChange}
      />
    ) : (
      <LanguageDropdowns
        inputLanguageValue={inputLanguage}
        inputLangauageOnChange={handleOnInputLanguageChange}
        outputLanguageValue={outputLanguage}
        outputLangauageOnChange={handleOnOutputLanguageChange}
      />
    )
  }

  return (
    <Tabs
      index={tabIndex}
      onChange={handleOnTabChange}
      isFitted
      variant={'enclosed-colored'}
      w={'100vw'}
      h={'100vh'}
      display="flex"
      flexDirection="column"
    >
      <Flex p={2} justifyContent={'space-between'} alignItems={'center'} position={'relative'}>
        <Button variant={tabIndex === TAB_INDEXES.History ? 'solid' : 'ghost'}>
          <MdHistory size={24} onClick={() => setTabIndex(4)} />
        </Button>

        <Flex position={'absolute'} left={'50%'} transform={'translateX(-50%)'}>
          <Heading size={'lg'} my={2} textAlign={'center'}>
            AI Voice Translator
          </Heading>
        </Flex>
        <Flex alignItems={'center'} ml={'auto'}>
          <FormLabel mx={2} my={1} htmlFor={'debug-mode'}>
            Debug Mode:
          </FormLabel>
          <Switch id={'debug-mode'} onChange={handleOnDebugModeChange} />
        </Flex>
      </Flex>
      <TabList>
        <Tab>Speech-To-Speech</Tab>
        <Tab>Translate File</Tab>
        <Tab>Translate URL</Tab>
        <Tab>Text-to-Speech</Tab>
      </TabList>
      <TabPanels overflowY="auto" maxH="100%">
        <TabPanel>
          <Stack maxW={MAX_CONTENT_WIDTH} mx={'auto'}>
            {renderLanguageDropdowns()}
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
          <Stack maxW={MAX_CONTENT_WIDTH} mx={'auto'}>
            {renderLanguageDropdowns()}
            <Text>Upload Existing Audio File:</Text>
            <FileUploadButton buttonText="Upload File" onChange={handleAudioFileUpload} />
          </Stack>
        </TabPanel>
        <TabPanel>
          <Stack maxW={MAX_CONTENT_WIDTH} mx={'auto'}>
            {renderLanguageDropdowns()}
            <Flex flexDir={'column'} flexGrow={1}>
              <Text>Audio URL:</Text>
              <Flex>
                <Input
                  value={userEnteredURL}
                  onChange={(event) => setUserEnteredURL(event.target.value)}
                  placeholder="Enter URL here..."
                />
                <Button w={'30%'} onClick={() => handleURLSubmission()}>
                  Submit URL
                </Button>
              </Flex>
            </Flex>
          </Stack>
        </TabPanel>
        <TabPanel>
          <Stack maxW={MAX_CONTENT_WIDTH} mx={'auto'}>
            <LanguageDropdown
              label={'Input Language'}
              value={inputLanguage}
              onChange={handleOnInputLanguageChange}
            />
            <Flex flexDir={'column'} flexGrow={1}>
              <Text>Text To Be Translated:</Text>
              <Textarea
                value={userEnteredText}
                onChange={(event) => setUserEnteredText(event.target.value)}
                placeholder="Enter text to be translated here..."
              />
            </Flex>
          </Stack>
        </TabPanel>
        <TabPanel>
          <HistoryItemList historyList={historyList?.history} />
        </TabPanel>
      </TabPanels>

      {!isHistoryTabActive && (
        <Stack maxW={MAX_CONTENT_WIDTH} w={'100%'} mx={'auto'}>
          {!isTextToSpeechTabActive && (
            <>
              <Box mb={4}>
                <AudioPlayer url={originalAudioUrl} type={'audio/wav'} />
              </Box>
              {debugMode && (
                <Button onClick={() => transcribeAudioInArrayBuffer()}>Transcribe</Button>
              )}
              <Textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                placeholder="Transcribed text goes here..."
              />
            </>
          )}

          <Stack mt={debugMode || isTextToSpeechTabActive ? 4 : 0}>
            <Flex>
              {(debugMode || isTextToSpeechTabActive) && (
                <>
                  <LanguageDropdown
                    value={outputLanguage}
                    onChange={handleOnOutputLanguageChange}
                  />
                  <Button w={'50%'} onClick={() => handleTranslatingText()}>
                    Translate
                  </Button>
                </>
              )}
            </Flex>
            <Textarea
              value={translatedText}
              onChange={(e) => setTranslatedText(e.target.value)}
              placeholder="Translated text goes here..."
            />
          </Stack>

          <Stack>
            {debugMode && (
              <Button onClick={() => handleTextToSpeech()}>Generate AI Voice 🤖</Button>
            )}
            <Text>Translated Audio:</Text>
            <AudioPlayer url={translatedAudioUrl} autoplay type={'audio/mp3'} />
          </Stack>
        </Stack>
      )}
    </Tabs>
  )
}

export default App
