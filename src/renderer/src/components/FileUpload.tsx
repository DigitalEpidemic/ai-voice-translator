import { Button, Flex, Text } from '@chakra-ui/react'
import React from 'react'
import { FiUpload } from 'react-icons/fi'

interface FileUploadProps {
  buttonText: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export const FileUploadButton = ({ buttonText, onChange }: FileUploadProps) => {
  const [fileName, setFileName] = React.useState<string>()

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(event)

    if (event.target.files) {
      setFileName(event.target.files?.[0]?.name)
    }
  }

  return (
    <Flex justifyContent="left" alignItems="center" gap={2}>
      <label>
        <input type="file" accept="audio/*" onChange={handleOnChange} style={{ display: 'none' }} />
        <Button leftIcon={<FiUpload />} as="span">
          {buttonText}
        </Button>
      </label>
      <Text>{fileName ? fileName : 'Please select an audio file...'}</Text>
    </Flex>
  )
}
