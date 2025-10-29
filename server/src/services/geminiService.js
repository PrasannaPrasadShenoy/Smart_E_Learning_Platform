const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
      this.genAI = null;
      this.model = null;
    } else {
      console.log('✅ Gemini API key found, initializing service...');
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
  }

  // Generate short notes (concise) - multilingual support
  async generateShortNotes(transcript, sourceLanguage = 'en') {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }
    
    try {
      const languageInstruction = sourceLanguage !== 'en' 
        ? `This transcript is in ${sourceLanguage}. Please translate and create notes in English.`
        : 'This transcript is in English.';

      const prompt = `Create concise bullet-point notes in English from this video transcript. ${languageInstruction}

Transcript:
${transcript}

Requirements:
- Create notes in clear English
- Focus on key concepts only (5-8 points)
- Translate and summarize the content
- Format as clean bullet points
- Keep it simple and easy to scan
- Ensure all content is in English

Format as clean bullet points. Keep it simple and easy to scan.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error for short notes:', error);
      throw new Error('Failed to generate short notes');
    }
  }

  // Generate detailed notes (enhanced with 30% extra content)
  async generateDetailedNotes(transcript) {
    try {
      const prompt = `Create detailed notes from this video transcript. Include:
1. Main content from the video
2. 30% additional related insights, best practices, and common pitfalls
3. Related topics and concepts that complement the video content
4. Practical applications and real-world examples

Transcript: ${transcript}

Format as structured notes with clear sections. Make it comprehensive and educational.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error for detailed notes:', error);
      throw new Error('Failed to generate detailed notes');
    }
  }

  // Generate questions based on content type and difficulty with retry mechanism
  async generateQuestions(transcript, difficulty = 'intermediate', count = 5, sourceLanguage = 'en') {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }
    
      const maxRetries = 5;
      const retryDelay = 5000; // 5 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Gemini attempt ${attempt}/${maxRetries} for questions generation...`);

        const languageInstruction = sourceLanguage !== 'en' 
          ? `This transcript is in ${sourceLanguage}. Please translate and create questions in English.`
          : 'This transcript is in English.';

        const prompt = `Generate ${count} questions in English based on this video transcript. ${languageInstruction}

Transcript:
${transcript}

Requirements:
- Create all questions in English
- Difficulty level: ${difficulty}
- Question distribution: 60% MCQ, 20% descriptive, 15% coding/predict output, 5% general knowledge
- For coding content: focus on output prediction and query writing
- Check answers based on expected output, not code style
- Include a mix of question types appropriate to the content
- Make questions challenging but fair for ${difficulty} level
- Translate and understand the content first, then create questions
- Make each question UNIQUE and different from others
- Ensure variety in question topics and approaches

Format as JSON array with this structure:
[
  {
    "question": "Question text here in English",
    "type": "mcq|descriptive|coding|predict-output|general",
    "options": ["Option A", "Option B", "Option C", "Option D"], // only for MCQ
    "correctAnswer": "Correct answer or explanation in English",
    "explanation": "Why this answer is correct in English",
    "difficulty": "${difficulty}"
  }
]`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Try to parse JSON, handle if it's wrapped in markdown
        let jsonText = text;
        if (text.includes('```json')) {
          jsonText = text.match(/```json\n([\s\S]*?)\n```/)[1];
        } else if (text.includes('```')) {
          jsonText = text.match(/```\n([\s\S]*?)\n```/)[1];
        }
        
        const questions = JSON.parse(jsonText);
        console.log(`✅ Gemini questions generated successfully (${questions.length} items) on attempt ${attempt}`);
        return questions;
        
      } catch (error) {
        console.error(`❌ Gemini API error for questions (attempt ${attempt}/${maxRetries}):`, error.message);
        
        // Check if it's a retryable error
        if (error.status === 503 || error.status === 429 || error.message.includes('overloaded') || error.message.includes('Service Unavailable')) {
            if (attempt < maxRetries) {
              const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff: 5s, 10s, 20s, 40s
              console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
        }
        
        // If it's the last attempt or non-retryable error, throw
        if (attempt === maxRetries) {
          console.error('🚫 All Gemini retry attempts failed');
          console.log('💡 Consider trying again later when Gemini API is less overloaded');
          throw new Error('Failed to generate questions after multiple attempts');
        }
      }
    }
  }

  // Generate course-level comprehensive test
  async generateCourseTest(courseTranscripts, difficulty = 'intermediate') {
    try {
      const prompt = `Generate 20 comprehensive questions covering the entire course:

Course Content: ${courseTranscripts.join('\n\n---\n\n')}

Requirements:
- Difficulty level: ${difficulty}
- Cover all major topics from the course
- Question distribution: 50% MCQ, 25% descriptive, 20% coding/output prediction, 5% general knowledge
- Include both specific video content and broader course understanding
- For coding: focus on output prediction and practical application
- Make questions comprehensive and test deep understanding

Format as JSON array with this structure:
[
  {
    "question": "Question text here",
    "type": "mcq|descriptive|coding|predict-output|general",
    "options": ["Option A", "Option B", "Option C", "Option D"], // only for MCQ
    "correctAnswer": "Correct answer or explanation",
    "explanation": "Why this answer is correct",
    "topic": "Topic or concept being tested",
    "difficulty": "${difficulty}"
  }
]`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Try to parse JSON, handle if it's wrapped in markdown
      let jsonText = text;
      if (text.includes('```json')) {
        jsonText = text.match(/```json\n([\s\S]*?)\n```/)[1];
      } else if (text.includes('```')) {
        jsonText = text.match(/```\n([\s\S]*?)\n```/)[1];
      }
      
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Gemini API error for course test:', error);
      throw new Error('Failed to generate course test');
    }
  }

  // Analyze content type to determine question distribution
  analyzeContentType(transcript) {
    const codingKeywords = ['function', 'variable', 'code', 'programming', 'algorithm', 'syntax', 'debug', 'compile'];
    const hasCodingContent = codingKeywords.some(keyword => 
      transcript.toLowerCase().includes(keyword)
    );
    
    return {
      hasCodingContent,
      estimatedComplexity: transcript.length > 2000 ? 'high' : 'medium'
    };
  }

  // Generate personalized feedback using Gemini
  async generateFeedback(feedbackData) {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }
    
    try {
      const prompt = `Generate personalized learning feedback based on this assessment data:

Test Score: ${feedbackData.testScore}%
Cognitive Load Index: ${feedbackData.cli}
CLI Classification: ${feedbackData.cliClassification}
Confidence Level: ${feedbackData.confidence}/5
Topic: ${feedbackData.topic}

Assessment Answers: ${JSON.stringify(feedbackData.answers)}
Cognitive Metrics: ${JSON.stringify(feedbackData.metrics)}

Generate comprehensive feedback including:
1. Summary of performance
2. Strengths (3-5 points)
3. Weaknesses (3-5 points)
4. Recommendations (3-5 actionable items)
5. Next steps (3-5 specific actions)
6. Personalized tips (3-5 tips)
7. Suggested topics for further study (3-5 topics)

Format as JSON with this structure:
{
  "summary": "Overall performance summary",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "nextSteps": ["step1", "step2", "step3"],
  "personalizedTips": ["tip1", "tip2", "tip3"],
  "suggestedTopics": ["topic1", "topic2", "topic3"]
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          return JSON.parse(jsonMatch[1]);
        }
        return JSON.parse(text);
      } catch (parseError) {
        console.error('Error parsing Gemini feedback response as JSON:', parseError);
        console.error('Raw Gemini response:', text);
        throw new Error('Invalid JSON response from Gemini API for feedback');
      }
    } catch (error) {
      console.error('Gemini feedback generation error:', error);
      throw new Error('Failed to generate feedback with Gemini');
    }
  }

  // Generate fallback feedback when Gemini is unavailable
  generateFallbackFeedback(feedbackData) {
    const score = feedbackData.testScore;
    const cli = feedbackData.cli;
    
    let summary = '';
    let strengths = [];
    let weaknesses = [];
    let recommendations = [];
    let nextSteps = [];
    let personalizedTips = [];
    let suggestedTopics = [];

    // Generate summary based on performance
    if (score >= 80) {
      summary = 'Excellent performance! You demonstrated strong understanding of the material.';
      strengths = ['Strong conceptual understanding', 'Good problem-solving skills', 'Effective learning approach'];
    } else if (score >= 60) {
      summary = 'Good performance with room for improvement. You have a solid foundation but can enhance your understanding.';
      strengths = ['Basic understanding present', 'Some concepts grasped well', 'Willingness to learn'];
      weaknesses = ['Some concepts need reinforcement', 'Could improve accuracy', 'More practice needed'];
    } else {
      summary = 'Performance indicates need for additional study. Focus on foundational concepts and practice.';
      strengths = ['Attempted all questions', 'Showed effort', 'Learning potential'];
      weaknesses = ['Fundamental concepts unclear', 'Need more practice', 'Study approach needs adjustment'];
    }

    // Generate recommendations based on score and CLI
    if (score < 70) {
      recommendations.push('Review foundational concepts');
      recommendations.push('Practice with similar problems');
      recommendations.push('Seek additional resources');
    }
    
    if (cli > 60) {
      recommendations.push('Take breaks during study sessions');
      recommendations.push('Practice mindfulness techniques');
      recommendations.push('Reduce cognitive load');
    }

    // Generate next steps
    nextSteps.push('Review incorrect answers');
    nextSteps.push('Practice weak areas');
    nextSteps.push('Set up regular study schedule');

    // Generate personalized tips
    personalizedTips.push('Focus on understanding, not memorization');
    personalizedTips.push('Practice regularly for better retention');
    personalizedTips.push('Ask questions when concepts are unclear');

    // Generate suggested topics
    suggestedTopics.push('Review basic concepts');
    suggestedTopics.push('Practice problem-solving');
    suggestedTopics.push('Explore advanced topics');

    return {
      summary,
      strengths,
      weaknesses,
      recommendations,
      nextSteps,
      personalizedTips,
      suggestedTopics
    };
  }

  // Summarize transcript using Gemini (multilingual support)
  async summarizeTranscript(transcript, sourceLanguage = 'en') {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }
    
    try {
      const languageInstruction = sourceLanguage !== 'en' 
        ? `This transcript is in ${sourceLanguage}. Please translate and summarize it in English.`
        : 'This transcript is in English.';

      const prompt = `Create a concise summary of this video transcript in English. ${languageInstruction}

Transcript:
${transcript}

Provide a summary that:
- Captures the main topic and key points
- Highlights important concepts
- Is concise but comprehensive
- Is written in clear English
- Suitable for quick review

Keep it under 200 words.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini summarization error:', error);
      throw new Error('Failed to summarize transcript with Gemini');
    }
  }

  // Generic content generation method
  async generateContent(prompt) {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error for content generation:', error);
      throw new Error('Failed to generate content');
    }
  }
}

module.exports = new GeminiService();
