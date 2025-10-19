const Question = require('../models/Question');
const { generateQuestions, generateFallbackQuestions } = require('../utils/openaiHelper');
const transcriptService = require('./transcriptService');

class QuestionService {
  /**
   * Generate questions for a course
   * @param {string} courseId - Course ID
   * @param {string} videoId - Video ID
   * @param {string} transcript - Video transcript
   * @param {string} topic - Topic/subject
   * @param {number} numQuestions - Number of questions to generate
   * @returns {Promise<Array>} Generated questions
   */
  async generateQuestionsForVideo(courseId, videoId, transcript, topic, numQuestions = 10) {
    try {
      // Check if questions already exist for this video
      const existingQuestions = await Question.find({
        courseId,
        videoId,
        isActive: true
      });

      if (existingQuestions.length >= numQuestions) {
        return existingQuestions.slice(0, numQuestions);
      }

      // Analyze transcript quality
      const qualityAnalysis = transcriptService.analyzeTranscriptQuality(transcript);
      
      if (!qualityAnalysis.suitable) {
        throw new Error(`Transcript quality too poor: ${qualityAnalysis.issues.join(', ')}`);
      }

      // Clean transcript
      const cleanTranscript = transcriptService.cleanTranscript(transcript);
      
      // Generate questions using OpenAI
      let generatedQuestions;
      try {
        generatedQuestions = await generateQuestions(cleanTranscript, topic, numQuestions);
      } catch (error) {
        console.error('OpenAI question generation failed:', error.message);
        generatedQuestions = generateFallbackQuestions(cleanTranscript, topic, numQuestions);
      }

      // Save questions to database
      const savedQuestions = [];
      for (const questionData of generatedQuestions) {
        const question = new Question({
          courseId,
          videoId,
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation || '',
          difficulty: questionData.difficulty || 'medium',
          topic: questionData.topic || topic,
          metadata: {
            generatedBy: process.env.OPENAI_API_KEY ? 'openai' : 'template',
            confidence: questionData.confidence || 0.8
          }
        });

        await question.save();
        savedQuestions.push(question);
      }

      return savedQuestions;

    } catch (error) {
      console.error('Question generation error:', error.message);
      throw new Error('Failed to generate questions');
    }
  }

  /**
   * Get questions for an assessment
   * @param {string} courseId - Course ID
   * @param {string} videoId - Video ID (optional)
   * @param {number} limit - Number of questions to return
   * @param {string} difficulty - Difficulty filter
   * @returns {Promise<Array>} Questions for assessment
   */
  async getQuestionsForAssessment(courseId, videoId = null, limit = 10, difficulty = null) {
    try {
      const query = {
        courseId,
        isActive: true
      };

      if (videoId) {
        query.videoId = videoId;
      }

      if (difficulty) {
        query.difficulty = difficulty;
      }

      const questions = await Question.find(query)
        .sort({ 'metadata.confidence': -1, createdAt: -1 })
        .limit(limit);

      if (questions.length === 0) {
        throw new Error('No questions available for this course');
      }

      // Shuffle questions for variety
      return this.shuffleArray(questions);

    } catch (error) {
      console.error('Get questions error:', error.message);
      throw new Error('Failed to retrieve questions');
    }
  }

  /**
   * Update question statistics after assessment
   * @param {string} questionId - Question ID
   * @param {boolean} isCorrect - Whether answer was correct
   */
  async updateQuestionStats(questionId, isCorrect) {
    try {
      await Question.findByIdAndUpdate(questionId, {
        $inc: {
          'metadata.attempts': 1,
          'metadata.correctAttempts': isCorrect ? 1 : 0
        }
      });
    } catch (error) {
      console.error('Update question stats error:', error.message);
    }
  }

  /**
   * Get question difficulty distribution
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} Difficulty distribution
   */
  async getDifficultyDistribution(courseId) {
    try {
      const pipeline = [
        { $match: { courseId, isActive: true } },
        { $group: {
          _id: '$difficulty',
          count: { $sum: 1 },
          avgSuccessRate: { $avg: '$successRate' }
        }}
      ];

      const distribution = await Question.aggregate(pipeline);
      
      return distribution.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          avgSuccessRate: Math.round(item.avgSuccessRate * 100) / 100
        };
        return acc;
      }, {});

    } catch (error) {
      console.error('Difficulty distribution error:', error.message);
      return {};
    }
  }

  /**
   * Get most challenging questions
   * @param {string} courseId - Course ID
   * @param {number} limit - Number of questions to return
   * @returns {Promise<Array>} Most challenging questions
   */
  async getMostChallengingQuestions(courseId, limit = 5) {
    try {
      return await Question.find({
        courseId,
        isActive: true,
        'metadata.attempts': { $gte: 3 }
      })
      .sort({ 'metadata.correctAttempts': 1, 'metadata.attempts': -1 })
      .limit(limit);

    } catch (error) {
      console.error('Get challenging questions error:', error.message);
      return [];
    }
  }

  /**
   * Validate question data
   * @param {Object} questionData - Question data to validate
   * @returns {Object} Validation result
   */
  validateQuestion(questionData) {
    const errors = [];

    if (!questionData.question || questionData.question.trim().length < 10) {
      errors.push('Question text is required and must be at least 10 characters');
    }

    if (!questionData.options || questionData.options.length !== 4) {
      errors.push('Exactly 4 options are required');
    }

    if (!questionData.correctAnswer || !questionData.options.includes(questionData.correctAnswer)) {
      errors.push('Correct answer must be one of the provided options');
    }

    if (!questionData.difficulty || !['easy', 'medium', 'hard'].includes(questionData.difficulty)) {
      errors.push('Difficulty must be easy, medium, or hard');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Shuffle array randomly
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate question preview (without correct answer)
   * @param {Object} question - Question object
   * @returns {Object} Question preview
   */
  generateQuestionPreview(question) {
    return {
      id: question._id,
      question: question.question,
      options: question.options,
      difficulty: question.difficulty,
      topic: question.topic,
      timeStamp: question.timeStamp
    };
  }
}

module.exports = new QuestionService();
