const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  // Generate short notes (concise)
  async generateShortNotes(transcript) {
    try {
      const prompt = `Create concise bullet-point notes from this video transcript. Focus on key concepts only (5-8 points):

${transcript}

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

  // Generate questions based on content type and difficulty
  async generateQuestions(transcript, difficulty = 'intermediate', count = 5) {
    try {
      const prompt = `Generate ${count} questions based on this video transcript:

${transcript}

Requirements:
- Difficulty level: ${difficulty}
- Question distribution: 60% MCQ, 20% descriptive, 15% coding/predict output, 5% general knowledge
- For coding content: focus on output prediction and query writing
- Check answers based on expected output, not code style
- Include a mix of question types appropriate to the content
- Make questions challenging but fair for ${difficulty} level

Format as JSON array with this structure:
[
  {
    "question": "Question text here",
    "type": "mcq|descriptive|coding|predict-output|general",
    "options": ["Option A", "Option B", "Option C", "Option D"], // only for MCQ
    "correctAnswer": "Correct answer or explanation",
    "explanation": "Why this answer is correct",
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
      console.error('Gemini API error for questions:', error);
      throw new Error('Failed to generate questions');
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
}

module.exports = new GeminiService();
