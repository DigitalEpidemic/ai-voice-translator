import { Box, Button, Flex, Text } from '@chakra-ui/react'
import { SpeechHistoryItemResponse } from 'elevenlabs/api'
import { useState } from 'react'
import { MdOutlineFileDownload, MdOutlinePlayCircle } from 'react-icons/md'

interface HistoryItemListProps {
  historyList: SpeechHistoryItemResponse[] | undefined
}

const convertUnixTimestampToReadableDate = (unixTimestamp: number): string => {
  return new Date(unixTimestamp * 1000).toLocaleString()
}

export const HistoryItemList = ({ historyList }: HistoryItemListProps): JSX.Element => {
  const [isPlaying, setIsPlaying] = useState(false)

  const handleDownload = async (history: SpeechHistoryItemResponse): Promise<void> => {
    console.log('Downloading audio file from history...')
    await window.api.downloadHistoryAudio(history.history_item_id)
  }

  const handlePlayAudio = async (history: SpeechHistoryItemResponse): Promise<void> => {
    if (isPlaying) {
      return
    }

    console.log('Playing audio file from history...')
    setIsPlaying(true)

    const audioBuffer = await window.api.downloadHistoryAudio(history.history_item_id, false)
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })
    const audioUrl = URL.createObjectURL(audioBlob)

    const audio = new Audio(audioUrl)
    audio.play()

    audio.onended = (): void => {
      setIsPlaying(false)
      URL.revokeObjectURL(audioUrl)
    }
  }

  return (
    <>
      {historyList?.map((history) => (
        <Flex key={history.history_item_id} alignItems={'center'}>
          <Flex flexDirection={'column'}>
            <Button
              w={8}
              h={6}
              p={0}
              mr={2}
              variant={'ghost'}
              onClick={() => handlePlayAudio(history)}
              isDisabled={isPlaying}
            >
              <MdOutlinePlayCircle size={24} />
            </Button>
            <Button
              w={8}
              h={6}
              p={0}
              mr={2}
              variant={'ghost'}
              onClick={() => handleDownload(history)}
            >
              <MdOutlineFileDownload size={24} />
            </Button>
          </Flex>
          <Box pb={3}>
            <Flex>
              <Text as={'b'} fontSize={'sm'} pr={2}>
                {history.voice_name}
              </Text>
              <Text as={'i'} color={'gray.600'} fontSize={'sm'}>
                - {convertUnixTimestampToReadableDate(history.date_unix as number)}
              </Text>
            </Flex>
            <Text>{history.text}</Text>
          </Box>
        </Flex>
      ))}
    </>
  )
}
