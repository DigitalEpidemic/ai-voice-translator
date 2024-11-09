import { Flex, Button, Box, Text } from '@chakra-ui/react'
import { SpeechHistoryItemResponse } from 'elevenlabs/api'
import { MdOutlineFileDownload } from 'react-icons/md'

interface HistoryItemProps {
  history: SpeechHistoryItemResponse
}

const convertUnixTimestampToReadableDate = (unixTimestamp: number): string => {
  return new Date(unixTimestamp * 1000).toLocaleString()
}

export const HistoryItem = ({ history }: HistoryItemProps): JSX.Element => {
  return (
    <Flex key={history.history_item_id} alignItems={'center'}>
      <Flex>
        <Button w={10} h={10} p={0} mr={2} variant={'ghost'}>
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
  )
}
