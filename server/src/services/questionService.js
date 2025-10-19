const geminiService = require('./geminiService');
const Question = require('../models/Question');

// Generate questions for a specific video
const generateVideoQuestions = async (transcript, videoId, courseId, difficulty = 'intermediate') => {
  try {
    console.log(`Generating ${difficulty} questions for video: ${videoId}`);
    
    const questions = await geminiService.generateQuestions(transcript, difficulty, 5);
    
    // Save questions to database
    const savedQuestions = await Promise.all(
      questions.map(async (q) => {
        const question = new Question({
        courseId,
        videoId,
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          difficulty: q.difficulty || difficulty,
          topic: extractTopic(transcript),
          metadata: {
            generatedBy: 'gemini',
            confidence: 0.9,
            type: q.type
          }
        });
        
        return await question.save();
      })
    );
    
    console.log(`Generated ${savedQuestions.length} questions successfully`);
    return savedQuestions;
  } catch (error) {
    console.error('Error generating video questions:', error);
    return generateFallbackVideoQuestions(transcript, videoId, courseId, difficulty);
  }
};

// Generate comprehensive course test
const generateCourseTest = async (courseTranscripts, courseId, difficulty = 'intermediate') => {
  try {
    console.log(`Generating comprehensive course test for course: ${courseId}`);
    
    const questions = await geminiService.generateCourseTest(courseTranscripts, difficulty);

      // Save questions to database
    const savedQuestions = await Promise.all(
      questions.map(async (q) => {
        const question = new Question({
          courseId,
          videoId: 'course-test', // Special identifier for course tests
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          difficulty: q.difficulty || difficulty,
          topic: q.topic || 'General',
          metadata: {
            generatedBy: 'gemini',
            confidence: 0.9,
            type: q.type,
            isCourseTest: true
          }
        });
        
        return await question.save();
      })
    );
    
    console.log(`Generated ${savedQuestions.length} course test questions successfully`);
      return savedQuestions;
    } catch (error) {
    console.error('Error generating course test:', error);
    return generateFallbackCourseTest(courseTranscripts, courseId, difficulty);
  }
};

// Extract topic from transcript
const extractTopic = (transcript) => {
  const commonTopics = [
    'programming', 'javascript', 'python', 'react', 'nodejs', 'database',
    'web development', 'data structures', 'algorithms', 'machine learning',
    'artificial intelligence', 'cloud computing', 'devops', 'security'
  ];
  
  const lowerTranscript = transcript.toLowerCase();
  const foundTopic = commonTopics.find(topic => 
    lowerTranscript.includes(topic)
  );
  
  return foundTopic || 'General';
};

// Fallback video questions when Gemini API fails
const generateFallbackVideoQuestions = async (transcript, videoId, courseId, difficulty) => {
  console.log('Using fallback for video questions');
  
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 30);
  const questions = sentences.slice(0, 5).map((sentence, index) => {
    const question = new Question({
      courseId,
      videoId,
      question: `What is the main concept discussed in this part of the video?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'The correct answer would be based on the video content.',
      explanation: 'This question tests understanding of the video content.',
      difficulty,
      topic: extractTopic(transcript),
      metadata: {
        generatedBy: 'fallback',
        confidence: 0.5,
        type: 'mcq'
      }
    });
    
    return question.save();
  });
  
  return await Promise.all(questions);
};

// Fallback course test when Gemini API fails
const generateFallbackCourseTest = async (courseTranscripts, courseId, difficulty) => {
  console.log('Using fallback for course test');
  
  const questions = [];
  for (let i = 0; i < 20; i++) {
    const question = new Question({
      courseId,
      videoId: 'course-test',
      question: `Course question ${i + 1}: What have you learned from this course?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'The correct answer would be based on the course content.',
      explanation: 'This question tests overall course understanding.',
      difficulty,
      topic: 'General',
      metadata: {
        generatedBy: 'fallback',
        confidence: 0.5,
        type: 'mcq',
        isCourseTest: true
      }
    });
    
    questions.push(await question.save());
  }
  
  return questions;
};

// Get questions for a video
const getVideoQuestions = async (videoId, difficulty = 'intermediate') => {
  try {
    const questions = await Question.find({
      videoId,
      difficulty,
      isActive: true
    }).sort({ createdAt: -1 });
    
    return questions;
    } catch (error) {
    console.error('Error fetching video questions:', error);
    return [];
  }
};

// Get course test questions
const getCourseTestQuestions = async (courseId, difficulty = 'intermediate') => {
  try {
    const questions = await Question.find({
        courseId,
      'metadata.isCourseTest': true,
      difficulty,
      isActive: true
    }).sort({ createdAt: -1 });
    
    return questions;
    } catch (error) {
    console.error('Error fetching course test questions:', error);
      return [];
    }
};

// Update question statistics
const updateQuestionStats = async (questionId, isCorrect) => {
  try {
    const question = await Question.findById(questionId);
    if (question) {
      question.metadata.attempts += 1;
      if (isCorrect) {
        question.metadata.correctAttempts += 1;
      }
      await question.save();
    }
  } catch (error) {
    console.error('Error updating question stats:', error);
  }
};

// Get questions for assessment (compatibility method)
const getQuestionsForAssessment = async (courseId, videoId, numQuestions = 5, difficulty = 'intermediate') => {
  try {
    console.log(`Getting ${numQuestions} questions for assessment: ${videoId}`);
    
    // Get existing questions from database first
    let questions = await Question.find({
      videoId,
      difficulty,
      isActive: true
    }).limit(numQuestions);

    // If not enough questions in database, generate new ones
    if (questions.length < numQuestions) {
      console.log('Not enough questions in database, generating new ones...');
      
      // Get transcript to generate questions
      const transcriptService = require('./transcriptService');
      const transcript = await transcriptService.getTranscript(videoId);
      
      if (transcript) {
        const newQuestions = await generateVideoQuestions(transcript, videoId, courseId, difficulty);
        questions = newQuestions.slice(0, numQuestions);
      }
    }

    return questions;
  } catch (error) {
    console.error('Error getting questions for assessment:', error);
    return [];
  }
};

// Generate question preview (compatibility method)
const generateQuestionPreview = (question) => {
    return {
      id: question._id,
      question: question.question,
    type: question.metadata.type,
      options: question.options,
      difficulty: question.difficulty,
    topic: question.topic
  };
};

module.exports = {
  generateVideoQuestions,
  generateCourseTest,
  getVideoQuestions,
  getCourseTestQuestions,
  updateQuestionStats,
  getQuestionsForAssessment,
  generateQuestionPreview
};