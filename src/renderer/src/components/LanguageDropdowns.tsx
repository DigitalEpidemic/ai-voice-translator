import { AvailableLanguageCodes } from '@/types/languageTypes'
import { HStack } from '@chakra-ui/react'
import { LanguageDropdown } from './LanguageDropdown'

interface LanguageDropdownProps {
  inputLanguageValue: AvailableLanguageCodes
  inputLangauageOnChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
  outputLanguageValue: AvailableLanguageCodes
  outputLangauageOnChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
}

export const LanguageDropdowns = ({
  inputLanguageValue,
  inputLangauageOnChange,
  outputLanguageValue,
  outputLangauageOnChange
}: LanguageDropdownProps): JSX.Element => {
  return (
    <HStack w={'100%'}>
      <LanguageDropdown
        label="Input Language"
        value={inputLanguageValue}
        onChange={inputLangauageOnChange}
      />
      <LanguageDropdown
        label="Output Language"
        value={outputLanguageValue}
        onChange={outputLangauageOnChange}
      />
    </HStack>
  )
}
