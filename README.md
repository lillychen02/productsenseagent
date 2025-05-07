# ElevenLabs Conversational AI Agent

This project implements a web application that enables voice conversations with ElevenLabs AI agents.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory with your ElevenLabs credentials:
   ```
   ELEVENLABS_API_KEY=your-api-key-here
   NEXT_PUBLIC_AGENT_ID=your-agent-id-here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to start interacting with the AI agent.

## Usage

1. When you open the application, you'll be asked to configure your agent:
   - Enter your ElevenLabs Agent ID directly in the input field.
   - Or leave it empty to use the signed URL approach (requires API key in environment variables).

2. Click "Continue" after configuring.

3. Click "Start Conversation" to begin interacting with the AI voice agent.
   - The app will request microphone permission.
   - When the connection is established, you can speak with the AI.

4. Click "Stop Conversation" when you're done.

## Notes

- The conversation requires microphone permissions.
- For private agents, you'll need to use the signed URL approach.
- You can create an ElevenLabs agent by following their [quickstart guide](https://elevenlabs.io/docs/conversational-ai/quickstart). 