const geminiService = require('./geminiService');
const Question = require('../models/Question');

// Generate questions for a specific video
const generateVideoQuestions = async (transcript, videoId, courseId, difficulty = 'intermediate', sourceLanguage = 'en') => {
  try {
    console.log(`Generating ${difficulty} questions for video: ${videoId} (language: ${sourceLanguage})`);
    
    const questions = await geminiService.generateQuestions(transcript, difficulty, 5, sourceLanguage);
    
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
  
  // Handle invalid courseId
  const validCourseId = courseId && courseId !== 'temp' ? courseId : `playlist_${videoId}`;
  
  // Extract some context from transcript if available
  const transcriptWords = transcript ? transcript.split(' ').slice(0, 20).join(' ') : '';
  const hasContent = transcriptWords.length > 10;
  
  // Create more video-specific fallback questions
  const fallbackQuestions = [
    {
      question: hasContent ? `Based on the video content about "${transcriptWords}", what is the main topic being discussed?` : 'What is the main topic covered in this video?',
      options: ['Fundamental concepts', 'Advanced techniques', 'Practical applications', 'All of the above'],
      correctAnswer: 'All of the above',
      explanation: 'Educational videos typically cover multiple aspects of a topic.',
      type: 'mcq'
    },
    {
      question: hasContent ? `What key concepts from "${transcriptWords}" should you focus on?` : 'Which learning approach would be most effective for this content?',
      options: ['Passive listening', 'Active note-taking', 'Interactive practice', 'Combination of methods'],
      correctAnswer: 'Combination of methods',
      explanation: 'A combination of learning methods ensures better understanding.',
      type: 'mcq'
    },
    {
      question: hasContent ? `How would you apply the concepts from "${transcriptWords}" in practice?` : 'What should you do after watching this video to reinforce learning?',
      options: ['Move to next video', 'Take a break', 'Practice the concepts', 'Skip to assessment'],
      correctAnswer: 'Practice the concepts',
      explanation: 'Practice helps solidify understanding and retention.',
      type: 'mcq'
    },
    {
      question: hasContent ? `Explain the key learning objectives of this video about "${transcriptWords}".` : 'Explain the key learning objectives of this video content.',
      correctAnswer: hasContent ? `The video about "${transcriptWords}" aims to provide educational content that enhances understanding of the topic through clear explanations and practical examples.` : 'The video aims to provide educational content that enhances understanding of the topic through clear explanations and practical examples.',
      explanation: 'Learning objectives focus on knowledge acquisition and skill development.',
      type: 'descriptive'
    },
    {
      question: hasContent ? `How would you apply the knowledge from this video about "${transcriptWords}" in a real-world scenario?` : 'How would you apply the knowledge from this video in a real-world scenario?',
      correctAnswer: hasContent ? `Apply the knowledge from "${transcriptWords}" by identifying relevant situations, practicing with examples, and gradually building confidence through hands-on experience.` : 'Apply the knowledge by identifying relevant situations, practicing with examples, and gradually building confidence through hands-on experience.',
      explanation: 'Real-world application involves recognizing opportunities and practicing in authentic contexts.',
      type: 'descriptive'
    }
  ];
  
  const questions = fallbackQuestions.map((q, index) => {
    const question = new Question({
      courseId: validCourseId,
      videoId,
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty,
      topic: extractTopic(transcript),
      metadata: {
        generatedBy: 'fallback',
        confidence: 0.5,
        type: q.type
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
    // Check if questionId is a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      console.log('Skipping stats update for fallback question:', questionId);
      return;
    }

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
      console.log(`Not enough questions in database (${questions.length}/${numQuestions}), generating new ones...`);
      
      // Get transcript to generate questions
      const transcriptService = require('./transcriptService');
      const transcriptData = await transcriptService.getTranscript(videoId);
      
      console.log('Transcript data for question generation:', {
        hasTranscript: transcriptData?.hasTranscript,
        wordCount: transcriptData?.wordCount,
        language: transcriptData?.language,
        transcriptLength: transcriptData?.transcript?.length
      });
      
      if (transcriptData && transcriptData.hasTranscript && transcriptData.transcript && transcriptData.transcript.length > 100) {
        console.log('Generating questions from transcript...');
        try {
          const newQuestions = await generateVideoQuestions(transcriptData.transcript, videoId, courseId, difficulty, transcriptData.language);
          console.log(`Generated ${newQuestions.length} new questions from transcript`);
          questions = newQuestions.slice(0, numQuestions);
    } catch (error) {
          console.error('Error generating questions from transcript:', error);
          console.log('Falling back to fallback questions due to generation error');
          const fallbackQuestions = generateFallbackQuestions('General educational content', difficulty);
          questions = fallbackQuestions.slice(0, numQuestions);
        }
      } else {
        console.log('No valid transcript available, using fallback questions');
        console.log('Transcript status:', {
          hasTranscript: transcriptData?.hasTranscript,
          transcriptLength: transcriptData?.transcript?.length,
          isLongEnough: transcriptData?.transcript?.length > 100
        });
        // Generate fallback questions if no transcript
        const fallbackQuestions = generateFallbackQuestions('General educational content', difficulty);
        questions = fallbackQuestions.slice(0, numQuestions);
      }
    }

    return questions;
    } catch (error) {
    console.error('Error getting questions for assessment:', error);
      return [];
    }
};

// Generate fallback questions when no transcript is available
const generateFallbackQuestions = (transcript, difficulty = 'intermediate') => {
  const mongoose = require('mongoose');
  
  // Generate unique ObjectIds for each question
  const generateUniqueId = (index) => {
    const baseId = '507f1f77bcf86cd7994390';
    return new mongoose.Types.ObjectId(baseId + (10 + index).toString());
  };
  
  // Create diverse fallback questions
  const fallbackQuestions = [
    {
      _id: generateUniqueId(1),
      question: 'What is the primary focus of this educational video?',
      type: 'mcq',
      options: ['Conceptual understanding', 'Practical implementation', 'Problem-solving techniques', 'All of the above'],
      correctAnswer: 'All of the above',
      explanation: 'Educational videos typically cover multiple learning aspects to provide comprehensive understanding.',
      difficulty: difficulty,
      topic: 'Learning Objectives',
      metadata: { type: 'mcq', generatedBy: 'fallback' }
    },
    {
      _id: generateUniqueId(2),
      question: 'Which learning approach would be most effective for this content?',
      type: 'mcq',
      options: ['Passive listening', 'Active note-taking', 'Interactive practice', 'Combination of methods'],
      correctAnswer: 'Combination of methods',
      explanation: 'A combination of learning methods ensures better retention and understanding of complex topics.',
      difficulty: difficulty,
      topic: 'Learning Methods',
      metadata: { type: 'mcq', generatedBy: 'fallback' }
    },
    {
      _id: generateUniqueId(3),
      question: 'What should be your next step after completing this video?',
      type: 'mcq',
      options: ['Move to the next topic', 'Practice with exercises', 'Review key concepts', 'Apply knowledge practically'],
      correctAnswer: 'Apply knowledge practically',
      explanation: 'Practical application helps solidify understanding and builds real-world skills.',
      difficulty: difficulty,
      topic: 'Learning Progression',
      metadata: { type: 'mcq', generatedBy: 'fallback' }
    },
    {
      _id: generateUniqueId(4),
      question: 'Explain the importance of understanding the fundamental concepts presented in this video.',
      type: 'descriptive',
      correctAnswer: 'Understanding fundamental concepts is crucial as they form the foundation for advanced learning, enable problem-solving in various contexts, and help in building expertise in the subject area.',
      explanation: 'Fundamental concepts provide the building blocks for more complex knowledge and practical applications.',
      difficulty: difficulty,
      topic: 'Conceptual Understanding',
      metadata: { type: 'descriptive', generatedBy: 'fallback' }
    },
    {
      _id: generateUniqueId(5),
      question: 'How would you apply the knowledge gained from this video in a real-world scenario?',
      type: 'descriptive',
      correctAnswer: 'The knowledge can be applied by identifying relevant situations where these concepts are useful, practicing with real examples, and gradually building confidence through hands-on experience.',
      explanation: 'Real-world application involves recognizing opportunities to use the knowledge and practicing in authentic contexts.',
      difficulty: difficulty,
      topic: 'Practical Application',
      metadata: { type: 'descriptive', generatedBy: 'fallback' }
    }
  ];

  return fallbackQuestions;
};

// Generate question preview (compatibility method)
const generateQuestionPreview = (question) => {
    return {
      id: question._id || question.id || 'fallback',
      question: question.question,
      type: question.metadata?.type || question.type || 'mcq',
      options: question.options || [],
      difficulty: question.difficulty || 'intermediate',
      topic: question.topic || 'General'
    };
};

module.exports = {
  generateVideoQuestions,
  generateCourseTest,
  getVideoQuestions,
  getCourseTestQuestions,
  updateQuestionStats,
  getQuestionsForAssessment,
  generateQuestionPreview,
  generateFallbackQuestions
};