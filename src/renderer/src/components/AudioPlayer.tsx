interface AudioPlayerProps {
  url: string | null
  type: 'audio/wav' | 'audio/mp3'
  autoplay?: boolean
}

export const AudioPlayer = ({ url, type, autoplay }: AudioPlayerProps): JSX.Element => {
  return (
    <audio key={url} autoPlay={autoplay} controls style={{ width: '100%' }}>
      {url && <source src={url} type={type} />}
      Your browser does not support the audio element.
    </audio>
  )
}
