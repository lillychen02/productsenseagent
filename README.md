# Loopie AI – Your AI Voice Interview Coach

Loopie is a voice-based AI coach that simulates product management interviews and gives you real-time feedback on your communication skills. Practice realistic interview scenarios and get actionable insights to improve your performance.

Built with:
- 🧠 **GPT-4** for context-sensitive prompts and intelligent scoring
- 🎙️ **ElevenLabs Conversational AI** for natural voice interactions
- ⚡ **Next.js 15** full-stack application with TypeScript
- 🗄️ **PostgreSQL + Prisma** for data persistence
- 🎨 **Tailwind CSS** for modern, responsive UI

## Demo
🚀 **[Try Loopie Live](https://your-deployed-url.vercel.app)**

![Loopie AI Interview Interface](demo.gif)

## How It Works
1. **Choose Interview Type**: Select from Product Sense, Product Reviews, or custom scenarios
2. **Voice Conversation**: AI interviewer asks questions and responds naturally to your answers
3. **Real-time Analysis**: GPT-4 evaluates your clarity, structure, depth, and overall performance
4. **Detailed Feedback**: Get comprehensive scoring and actionable improvement suggestions
5. **Email Results**: Receive your interview analysis and recommendations via email

## What We Built

### 🎯 **Core Features**
- **Voice-First Experience**: Natural conversation flow with ElevenLabs AI
- **Multiple Interview Types**: Product Sense, Product Reviews, and more
- **Real-time Scoring**: Live feedback on communication effectiveness
- **Comprehensive Analytics**: Detailed breakdowns of strengths and areas for improvement
- **Email Integration**: Professional results delivery with PDF reports
- **Session Management**: Track progress across multiple interview sessions

### 🏗️ **Technical Architecture**
- **Frontend**: React 18 + TypeScript with modern hooks and state management
- **Backend**: Next.js API routes with PostgreSQL database
- **AI Integration**: OpenAI GPT-4 for scoring, ElevenLabs for voice synthesis
- **Real-time Communication**: WebSocket connections for live interview feedback
- **Email Service**: Automated results delivery with styled templates
- **Deployment**: Vercel hosting with edge functions

## Tech Stack

**AI & Voice**
- OpenAI GPT-4 API
- ElevenLabs Conversational AI
- Custom prompt engineering for interview scenarios

**Frontend**
- Next.js 15 (App Router)
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui components
- Framer Motion for animations

**Backend & Database**
- Next.js API routes
- PostgreSQL database
- Prisma ORM
- Session management

**Deployment & Tools**
- Vercel hosting
- Environment-based configuration
- ESLint + TypeScript for code quality

## Why We Built This

Traditional interview prep resources are static and don't simulate the real pressure of live conversations. Loopie bridges this gap by:

- **Simulating Real Interviews**: Voice-based interactions mirror actual interview conditions
- **Providing Instant Feedback**: No waiting days for feedback - get insights immediately
- **Personalizing Learning**: AI adapts questions based on your responses and progress
- **Scaling Access**: Make high-quality interview coaching accessible to everyone

## Setup & Development

```bash
# Clone the repository
git clone https://github.com/lillychen02/productsenseagent.git
cd productsenseagent

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys for OpenAI, ElevenLabs, and database

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables
```env
OPENAI_API_KEY=your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
DATABASE_URL=your-postgresql-url
NEXT_PUBLIC_AGENT_ID=your-elevenlabs-agent-id
```

## Contributing

We welcome contributions! Whether it's new interview scenarios, UI improvements, or feature enhancements:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Submit a pull request with a clear description

## Roadmap

- [ ] **Video Interview Mode**: Add visual cues and body language analysis
- [ ] **Custom Scenarios**: User-generated interview questions and scenarios
- [ ] **Team Practice**: Group interview simulations
- [ ] **Advanced Analytics**: Detailed performance tracking over time
- [ ] **Mobile App**: Native iOS/Android applications

## Credits

Built with ❤️ by **Lillian Chen**  
🔗 [LinkedIn](https://linkedin.com/in/workwithlee) | 🐦 [Twitter](https://twitter.com/workwithlee)

---

*Loopie AI: Where practice meets perfection. Transform your interview skills with the power of AI.* 