# 🤖 Context-Aware Chatbot Feature

## Overview

The ILA Context-Aware Chatbot is an intelligent educational assistant powered by Google Gemini 1.5 Flash that helps students understand concepts from educational videos. It uses video transcripts, descriptions, and topics as context to provide accurate, relevant answers.

## Features

✅ **Context-Aware Responses** - Uses video transcripts, descriptions, and topics as context  
✅ **Free Tier Friendly** - Uses Gemini 1.5 Flash (cost-effective)  
✅ **Real-time Chat** - Interactive chat interface with instant responses  
✅ **Smart Context Detection** - Automatically fetches transcripts when available  
✅ **Fallback Support** - Works even without context (general questions)  
✅ **Beautiful UI** - Modern, responsive chat interface  

## Architecture

### Backend

- **Service**: `server/src/services/chatService.js`
  - Builds context-aware prompts
  - Fetches video transcripts from MongoDB
  - Integrates with Gemini service
  - Handles context prioritization (transcript > description > topic)

- **Routes**: `server/src/routes/chatRoutes.js`
  - `POST /api/chat` - Main chat endpoint with context
  - `POST /api/chat/quick` - Quick chat without context
  - Protected with JWT authentication

### Frontend

- **Service**: `client/src/services/chatService.ts`
  - TypeScript service for API calls
  - Handles request/response types

- **Component**: `client/src/components/ChatBot.tsx`
  - Floating chat button
  - Chat window with message history
  - Auto-scroll and focus management
  - Loading states and error handling

- **Integration**: `client/src/pages/VideoPlayerPage.tsx`
  - Automatically passes video context (ID, transcript, description, title)
  - Available on all video pages

## API Endpoints

### POST /api/chat

Send a message with context.

**Request:**
```json
{
  "message": "Explain why loss increases in gradient descent",
  "transcript": "optional transcript text...",
  "description": "optional video description...",
  "topic": "optional topic name",
  "videoId": "optional video ID to fetch transcript"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reply": "Your answer here...",
    "hasContext": true,
    "contextType": "transcript"
  }
}
```

### POST /api/chat/quick

Send a quick message without context (for general questions).

**Request:**
```json
{
  "message": "What is machine learning?"
}
```

## Usage

### For Students

1. Navigate to any video page
2. Click the chat button (bottom-right corner)
3. Ask questions about the video content
4. The chatbot automatically uses the video transcript as context

### For Developers

#### Backend Usage

```javascript
const chatService = require('./services/chatService')

// Generate response with context
const response = await chatService.generateResponse({
  message: "Explain this concept",
  transcript: "Video transcript...",
  description: "Video description...",
  topic: "Machine Learning",
  videoId: "abc123"
})
```

#### Frontend Usage

```typescript
import { chatService } from '../services/chatService'

// Send message with context
const response = await chatService.sendMessage({
  message: "What is gradient descent?",
  videoId: "abc123",
  transcript: "transcript text..."
})
```

## Context Priority

The chatbot uses context in this order:

1. **Transcript** (highest priority) - Full video transcript if available
2. **Description** - Video description as fallback
3. **Topic** - Video title/topic as minimal context
4. **None** - General knowledge if no context available

## System Prompt

The chatbot is configured with an educational system prompt that:
- Provides clear, student-friendly explanations
- Uses context as primary source of truth
- Breaks down complex concepts
- Uses examples and analogies
- Encourages learning and curiosity

## Configuration

### Environment Variables

No additional environment variables needed! The chatbot uses the existing `GEMINI_API_KEY`.

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Model Configuration

The chatbot uses **Gemini 1.5 Flash** model:
- Fast responses
- Free tier friendly
- Good context understanding
- Cost-effective

Configured in: `server/src/services/geminiService.js`

## Error Handling

The chatbot handles various error scenarios:

- **Missing API Key** - Clear error message
- **Rate Limits** - User-friendly retry message
- **Network Errors** - Graceful degradation
- **Invalid Input** - Validation with helpful messages

## UI Features

- **Floating Button** - Always accessible
- **Message History** - Scrollable chat history
- **Loading States** - Visual feedback during processing
- **Context Indicators** - Shows what context is being used
- **Character Counter** - 2000 character limit
- **Keyboard Shortcuts** - Enter to send
- **Auto-scroll** - Automatically scrolls to latest message
- **Clear Chat** - Reset conversation

## Performance

- **Response Time**: ~2-5 seconds (depends on Gemini API)
- **Context Length**: Up to 30,000 characters from transcript
- **Message Limit**: 2000 characters per message
- **Rate Limiting**: Protected by Express rate limiter

## Security

- ✅ JWT authentication required
- ✅ Input validation and sanitization
- ✅ Rate limiting on endpoints
- ✅ CORS protection
- ✅ Error message sanitization

## Future Enhancements

Potential improvements:
- [ ] Chat history persistence
- [ ] Suggested questions
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Code syntax highlighting
- [ ] Math equation rendering
- [ ] Export chat history

## Troubleshooting

### Chat not responding

1. Check if `GEMINI_API_KEY` is set in `.env`
2. Verify API key is valid
3. Check server logs for errors
4. Ensure user is authenticated

### No context available

- The chatbot works without context (general questions)
- Transcripts are fetched automatically if `videoId` is provided
- Check if video has a transcript in the database

### Slow responses

- Normal response time is 2-5 seconds
- Check Gemini API status
- Verify network connection
- Large transcripts may take longer

## Testing

### Manual Testing

1. Start the server: `npm run dev` (in `server/` directory)
2. Start the client: `npm run dev` (in `client/` directory)
3. Navigate to a video page
4. Click the chat button
5. Ask a question about the video

### API Testing

```bash
# Test chat endpoint
curl -X POST http://localhost:4001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "What is this video about?",
    "videoId": "dQw4w9WgXcQ"
  }'
```

## Support

For issues or questions:
1. Check server logs
2. Verify environment variables
3. Test API endpoints directly
4. Check Gemini API status

---

**Built with ❤️ for ILA (Intelligent Learning Assistant)**


