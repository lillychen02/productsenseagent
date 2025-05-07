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

3. Click "Start Interview" to begin interacting with the AI voice agent.
   - The app will request microphone permission.
   - When the connection is established, you can speak with the AI.

4. Click "End Interview" when you're done.

## Testing the Transcript Feature

The application includes a transcript feature that captures and displays all conversation messages. To verify it's working correctly:

1. Open your browser's developer console (F12 or right-click > Inspect > Console)
2. Look for console logs showing transcript activity
3. Use the built-in debug helpers to test transcript functionality:
   ```javascript
   // Add a test AI message (simulates interviewer)
   window.debugTranscripts.testTranscript()
   
   // Add a test user message (simulates candidate)
   window.debugTranscripts.testUserMessage()
   
   // Check the transcript API data
   window.debugTranscripts.checkAPI()
   
   // Get the current session ID
   window.debugTranscripts.logSessionId()
   
   // Get all current transcripts
   window.debugTranscripts.getTranscripts()
   ```

4. Check the transcript display in the UI - after adding test messages, they should appear in the transcript section

## Notes

- The conversation requires microphone permissions.
- For private agents, you'll need to use the signed URL approach.
- You can create an ElevenLabs agent by following their [quickstart guide](https://elevenlabs.io/docs/conversational-ai/quickstart).
- Transcript data is stored temporarily in memory - for production, implement a database solution. 