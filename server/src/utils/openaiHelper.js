const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate questions from transcript using OpenAI
 * @param {string} transcript - Video transcript text
 * @param {string} topic - Topic/subject area
 * @param {number} numQuestions - Number of questions to generate
 * @returns {Promise<Array>} Generated questions
 */
const generateQuestions = async (transcript, topic, numQuestions = 10) => {
  try {
    const prompt = `
Generate ${numQuestions} multiple-choice questions based on the following transcript about ${topic}.

Transcript: "${transcript}"

Requirements:
1. Questions should test understanding of key concepts
2. Each question should have 4 options (A, B, C, D)
3. Only one correct answer per question
4. Include difficulty levels: easy, medium, hard
5. Provide brief explanations for correct answers
6. Focus on practical application and conceptual understanding

Format the response as a JSON array with this structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option B",
    "explanation": "Brief explanation of why this is correct",
    "difficulty": "medium",
    "topic": "specific topic area"
  }
]
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert educational content creator. Generate high-quality multiple-choice questions that test deep understanding of concepts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    
    // Parse JSON response
    try {
      const questions = JSON.parse(content);
      return questions;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return generateFallbackQuestions(transcript, topic, numQuestions);
    }

  } catch (error) {
    console.error('OpenAI API error:', error);
    return generateFallbackQuestions(transcript, topic, numQuestions);
  }
};

/**
 * Generate personalized feedback using OpenAI
 * @param {Object} assessmentData - Assessment results and metrics
 * @returns {Promise<Object>} Generated feedback
 */
const generateFeedback = async (assessmentData) => {
  try {
    const { testScore, cli, confidence, answers, metrics } = assessmentData;
    
    const prompt = `
Generate personalized learning feedback based on the following assessment data:

Test Score: ${testScore}%
Cognitive Load Index: ${cli} (${assessmentData.cliClassification})
Confidence Level: ${confidence}/5
Average Focus: ${metrics?.avgOnScreen || 85}%
Blink Rate: ${metrics?.blinkRatePerMin || 15} per minute

Provide feedback in this JSON format:
{
  "summary": "Brief overall assessment summary",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "nextSteps": ["step1", "step2"],
  "personalizedTips": ["tip1", "tip2"],
  "suggestedTopics": ["topic1", "topic2"]
}

Focus on:
1. Specific areas of strength and improvement
2. Actionable recommendations
3. Learning strategies based on cognitive load
4. Next learning topics to explore
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert learning coach. Provide personalized, actionable feedback to help students improve their learning outcomes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    
    try {
      const feedback = JSON.parse(content);
      return feedback;
    } catch (parseError) {
      console.error('Error parsing feedback response:', parseError);
      return generateFallbackFeedback(assessmentData);
    }

  } catch (error) {
    console.error('OpenAI feedback generation error:', error);
    return generateFallbackFeedback(assessmentData);
  }
};

/**
 * Summarize transcript using OpenAI
 * @param {string} transcript - Video transcript
 * @returns {Promise<string>} Summarized content
 */
const summarizeTranscript = async (transcript) => {
  try {
    const prompt = `
Summarize the following video transcript into key concepts and main points:

"${transcript}"

Provide a concise summary (2-3 paragraphs) that captures:
1. Main topics covered
2. Key concepts explained
3. Important details or examples
4. Learning objectives achieved

Keep it educational and focused on what a student should understand.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    return response.choices[0].message.content.trim();

  } catch (error) {
    console.error('OpenAI summarization error:', error);
    return transcript.substring(0, 500) + '...'; // Fallback to truncated transcript
  }
};

/**
 * Fallback question generation when OpenAI is unavailable
 */
const generateFallbackQuestions = (transcript, topic, numQuestions) => {
  const questions = [];
  const words = transcript.split(' ').filter(word => word.length > 4);
  const keyTerms = [...new Set(words)].slice(0, 10);
  
  for (let i = 0; i < Math.min(numQuestions, 5); i++) {
    const term = keyTerms[i % keyTerms.length];
    questions.push({
      question: `What is the main concept related to "${term}" in this ${topic} content?`,
      options: [
        `Primary concept A related to ${term}`,
        `Primary concept B related to ${term}`,
        `Primary concept C related to ${term}`,
        `Primary concept D related to ${term}`
      ],
      correctAnswer: `Primary concept A related to ${term}`,
      explanation: `This is the main concept related to ${term} as discussed in the content.`,
      difficulty: 'medium',
      topic: topic
    });
  }
  
  return questions;
};

/**
 * Fallback feedback generation when OpenAI is unavailable
 */
const generateFallbackFeedback = (assessmentData) => {
  const { testScore, cli, confidence } = assessmentData;
  
  let summary = '';
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];
  
  if (testScore >= 80) {
    summary = 'Excellent performance! You have a strong understanding of the material.';
    strengths.push('High test score indicates good comprehension');
  } else if (testScore >= 60) {
    summary = 'Good progress! You understand most concepts but have room for improvement.';
    strengths.push('Solid understanding of core concepts');
  } else {
    summary = 'There are areas for improvement. Consider reviewing the material.';
    weaknesses.push('Lower test score suggests need for review');
  }
  
  if (cli <= 35) {
    strengths.push('Low cognitive load indicates comfortable learning pace');
  } else if (cli >= 70) {
    weaknesses.push('High cognitive load suggests material may be challenging');
    recommendations.push('Take breaks and review concepts more slowly');
  }
  
  if (confidence >= 4) {
    strengths.push('High confidence in your understanding');
  } else {
    recommendations.push('Build confidence through practice and review');
  }
  
  return {
    summary,
    strengths,
    weaknesses,
    recommendations: [
      ...recommendations,
      'Continue practicing with similar content',
      'Focus on areas where you scored lower'
    ],
    nextSteps: [
      'Review incorrect answers',
      'Practice with additional questions',
      'Move to next topic when ready'
    ],
    personalizedTips: [
      'Take notes while learning',
      'Test yourself regularly',
      'Ask questions when confused'
    ],
    suggestedTopics: [assessmentData.topic || 'Related concepts']
  };
};

module.exports = {
  generateQuestions,
  generateFeedback,
  summarizeTranscript,
  generateFallbackQuestions,
  generateFallbackFeedback
};
