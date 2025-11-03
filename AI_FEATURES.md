# 🤖 AI-Powered Learning Features

This document describes the AI features implemented using Google Gemini API and AssemblyAI, plus caching, retries, and certificate workflow.

## 🎯 Features Overview

### 1. **Smart Notes Generation**
- **Short Notes**: Concise bullet points (5-8 key concepts)
- **Detailed Notes**: Enhanced with 30% additional insights, best practices, and related topics
- **Context-Aware**: Adapts to video content type and complexity
 - **UI**: Popups on video page; PDF download available

### 2. **Intelligent Question Generation**
- **5 Questions per Video**: Context-based distribution
- **20 Questions per Course**: Comprehensive course test
- **Multiple Question Types**: MCQ, descriptive, coding, predict output, general knowledge
- **Difficulty Levels**: Beginner, Intermediate, Advanced (user-selectable)
 - **Flow**: Generate → store in DB → button switches to Start → user starts explicitly
 - **Retries**: Gemini retries with backoff; video-specific fallback only if AI unavailable

### 3. **Transcript & Content Pipeline**
- **Primary Transcript**: AssemblyAI (multilingual detection, English output for notes/tests)
- **Fallbacks**: YouTube captions API, youtube-transcript library, metadata-based transcript
- **Caching**: Transcripts stored in DB and reused by notes and assessments
- **Content Analysis**: Determines coding vs. theory for prompt shaping
- **Automatic Content Detection**: Identifies coding vs. theoretical content
- **Smart Distribution**: 60% MCQ, 20% descriptive, 15% coding, 5% general
- **Output-Based Assessment**: Focus on results, not code style

## 🔧 API Endpoints (selected)

### Video Content
```
GET /api/youtube/video/:videoId/content?difficulty=intermediate
```
**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "abc123",
    "transcript": "Video transcript...",
    "notes": {
      "short": "• Key point 1\n• Key point 2...",
      "detailed": "## Main Content\n...\n## Additional Insights\n...",
      "generatedAt": "2024-01-01T00:00:00.000Z",
      "fallback": false
    },
    "questions": [
      {
        "id": "question_id",
        "question": "What is the main concept?",
        "type": "mcq",
        "options": ["A", "B", "C", "D"],
        "difficulty": "intermediate",
        "topic": "programming"
      }
    ],
    "totalQuestions": 5
  }
}
```

### Video Notes Only
```
GET /api/youtube/video/:videoId/notes
```

### Video Questions Only
```
GET /api/youtube/video/:videoId/questions?difficulty=intermediate
```

### Course Test
```
POST /api/youtube/course/:courseId/test
Content-Type: application/json

{
  "difficulty": "intermediate"
}
```

## 🧠 AI Service Architecture

### GeminiService (`server/src/services/geminiService.js`)
- **Main AI Integration**: Handles all Gemini API calls
- **Content Analysis**: Determines content type and complexity
- **Smart Prompting**: Optimized prompts for different tasks
- **Retries & Error Handling**: Backoff, structured errors; graceful fallbacks when API fails

### SummaryService (`server/src/services/summaryService.js`)
- **Short Notes**: Concise bullet points
- **Detailed Notes**: Enhanced with extra insights
- **Fallback Generation**: Template-based when AI fails
- **Parallel Processing**: Generates both types simultaneously

### QuestionService (`server/src/services/questionService.js`)
- **Video Questions**: 5 questions per video
- **Course Tests**: 20 comprehensive questions
- **Database Integration**: Saves questions to MongoDB
- **Statistics Tracking**: Monitors question performance
 - **Deduplication**: Reduces repeated questions across a set

### TranscriptService (`server/src/services/transcriptService.js`)
- **Primary**: AssemblyAI upload, poll, and fetch
- **Fallbacks**: Captions API, transcript library, metadata synthesis
- **Caching**: Saves transcripts to `Transcript` collection

## 📊 Question Types

### 1. **MCQ (Multiple Choice)**
- 4 options (A, B, C, D)
- Single correct answer
- Clear explanations

### 2. **Descriptive**
- Open-ended questions
- Subjective answers
- Critical thinking focus

### 3. **Coding Questions**
- Code snippets to complete
- Output prediction
- Algorithm implementation

### 4. **Predict Output**
- Given code, predict result
- Focus on logic understanding
- No code style assessment

### 5. **General Knowledge**
- Related topics beyond video
- Industry best practices
- Real-world applications

## 🎛️ Difficulty Levels

### Beginner
- Basic concepts
- Simple applications
- Foundational understanding

### Intermediate
- Practical applications
- Problem-solving
- Moderate complexity

### Advanced
- Complex scenarios
- Deep understanding
- Expert-level challenges

## 💰 Cost Optimization

### Gemini API Benefits
- **3x cheaper** than OpenAI for input tokens
- **25% cheaper** for output tokens
- **Better rate limits** for free tier
- **Faster responses** in many cases

### Expected Costs
- **Small Scale**: $1-3/month
- **Medium Scale**: $10-30/month
- **Large Scale**: $50-150/month

### Free Tier Limits
- **15 requests/minute**
- **1M tokens/day**
- **Perfect for development/testing**

## 🔄 Fallback & Resilience

### When Gemini API Fails
1. **Template-Based Generation**: Simple fallback questions
2. **Content Extraction**: Basic note generation
3. **Error Logging**: Track API failures
4. **User Notification**: Inform about fallback mode

### Fallback Content
- **Short Notes**: Key sentence extraction
- **Questions**: Generic question templates
- **Detailed Notes**: Basic content summary

## 🚀 Usage Examples

### Generate Video Content
```javascript
// Get AI-generated content for a video
const response = await fetch('/api/youtube/video/abc123/content?difficulty=intermediate');
const data = await response.json();

console.log('Short Notes:', data.data.notes.short);
console.log('Detailed Notes:', data.data.notes.detailed);
console.log('Questions:', data.data.questions);
```

### Generate Course Test
```javascript
// Generate comprehensive course test
const response = await fetch('/api/youtube/course/PL123/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ difficulty: 'advanced' })
});

const data = await response.json();
console.log('Course Test:', data.data.questions);
```

## 🔧 Environment Setup

### Required Environment Variables
```bash
GEMINI_API_KEY=your_gemini_api_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
YOUTUBE_DATA_API_KEY=your_youtube_data_api_key_here
```

### Get Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to your `.env` file
4. Restart the server

## 📈 Performance Monitoring

### Logging
- API request/response times
- Token usage tracking
- Error rate monitoring
- Fallback usage statistics

### Metrics
- Questions generated per video
- Notes generation success rate
- API response times
- Cost per request

## 🎯 Future Enhancements

### Planned Features
- **Multilingual Support**: Multiple languages
- **Custom Prompts**: User-defined question styles
- **Batch Processing**: Multiple videos at once
- **Advanced Analytics**: Learning pattern analysis

### Integration Opportunities
- **Progress Tracking**: Link to user progress
- **Personalization**: Adaptive difficulty
- **Social Features**: Share notes and questions
- **Export Options**: PDF, Markdown formats

## 🏅 Certificates Flow

- When a playlist reaches 100% completion, a certificate is issued
- PDF generated via Puppeteer (server-side), saved under `server/temp/certificates/`
- Available in Profile → Certificates and `/profile/completed`, with authenticated download

## 🛠️ Troubleshooting

### Common Issues
1. **API Key Missing**: Check environment variables
2. **Rate Limiting**: Implement request queuing
3. **Content Filtering**: Handle inappropriate content
4. **Token Limits**: Monitor usage and implement caching

### Debug Mode
```javascript
// Enable detailed logging
process.env.DEBUG_AI = 'true';
```

## 📚 Documentation Links

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://makersuite.google.com/)
- [Rate Limits and Pricing](https://ai.google.dev/pricing)

---

**Built with ❤️ using Google Gemini AI**
