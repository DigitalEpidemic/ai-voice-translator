# AI Voice Translator

A voice translator and transcriber app created in Electron with React and TypeScript
![image](https://github.com/user-attachments/assets/0cb9ff66-5071-4def-ac95-f9a412a9e8fb)

### Input/Output Audio Example: (Unmute to listen)
<table>
  <tr>
    <td>
      <video src='https://github.com/user-attachments/assets/ea9deb48-3e6a-48fd-bbb6-59181e9428e7'></video>
    </td>
    <td>
      <video src='https://github.com/user-attachments/assets/82c4c136-8839-4d2b-b72a-b023d29d2d54'></video>
    </td>
  </tr>
</table>
<br/>

# Features

**Note: You must setup Voice Cloning to translate your own voice into any of the 32 supported languages).**

- **Speech-To-Speech**
  - Select your `Input Language` and `Output Language`
  - `Start Recording` from your microphone and once you `Stop Recording`, it will transcribe whatever you said, translate to the language of your choice, then output the translated voice.
- **Translate File**
  - Select your `Input Language` and `Output Language`
  - `Upload File` locally, then it will also transcribe, translate, then output the translated voice.
- **Translate URL**
  - Select your `Input Language` and `Output Language`
  - Enter the `Audio URL`, then click `Submit URL` and it will also transcribe, translate, then output the translated voice.
- **Text-To-Speech**
  - Select your `Input Language` and `Output Language`
  - Enter any `Text To Be Translated` in the input, click `Translate` and it will translate, then output the translated voice.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Node v22](https://nodejs.org/en/download/package-manager) (Installing via `NVM` is recommended)

## Project Setup

### API Keys

You will need to make an account and get an API for the following:

- **Deepgram**
  - Link: https://deepgram.com/
  - Tier: **Free** (Includes $200 of credit)
- **AssemblyAI**
  - Link: https://www.assemblyai.com/
  - Tier: **Free** (Includes $50 of credit)
- **ElevenLabs**
  - Link: https://elevenlabs.io/
  - Tier: **Starter** or higher for Voice Cloning ($5 USD/month). **Free** (10k credits) for generic voice generation
  - Note: You will need to copy your Voice ID for the .env variable if you do clone or want a different voice

### .env Setup

```bash
cp .env.example .env
```

Then populate the following API Keys in your `.env` file:

- `VITE_DEEPGRAM_API_KEY`
- `VITE_ASSEMBLYAI_API_KEY`
- `VITE_ELEVENLABS_API_KEY`
- `VITE_ELEVENLABS_VOICE_ID` (Use one your IDs from [ElevenLabs Voice Lab](https://elevenlabs.io/app/voice-lab) or it will default to Will)

### Install

```bash
yarn
```

### Development

```bash
yarn dev
```

### Build

```bash
# For windows
yarn build:win

# For macOS
yarn build:mac

# For Linux
yarn build:linux
```
