import { AvailableLanguageCodes, languages } from '@/types/languageTypes'
import { Flex, Select, Text } from '@chakra-ui/react'

interface LanguageDropdownProps {
  label?: string
  value: AvailableLanguageCodes
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
}

export const LanguageDropdown = ({
  label,
  value,
  onChange
}: LanguageDropdownProps): JSX.Element => {
  return (
    <Flex flexDir={'column'} flexGrow={1}>
      {label ? <Text>{label}:</Text> : null}
      <Select onChange={onChange} value={value}>
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.name}
          </option>
        ))}
      </Select>
    </Flex>
  )
}
