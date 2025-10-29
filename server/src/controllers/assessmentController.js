const { validationResult } = require('express-validator');
const Assessment = require('../models/Assessment');
const questionService = require('../services/questionService');
const cliService = require('../services/cliService');
const feedbackService = require('../services/feedbackService');
const playlistProgressService = require('../services/playlistProgressService');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Start a new assessment
 */
const startAssessment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { courseId, videoId, numQuestions = 10, difficulty } = req.body;
  const userId = req.user._id;

  // Get questions for the assessment
  const questions = await questionService.getQuestionsForAssessment(
    courseId,
    videoId,
    numQuestions,
    difficulty
  );

  if (questions.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No questions available for this video. Please try another video or check if the video has a transcript.'
    });
  }

  // Ensure we have at least some questions
  const finalQuestions = questions.length >= numQuestions ? questions.slice(0, numQuestions) : questions;

  // Create assessment record
  const assessment = new Assessment({
    userId,
    courseId,
    videoId,
    status: 'in-progress',
    metadata: {
      sessionInfo: {
        startTime: new Date(),
        totalFocusTime: 0,
        distractions: 0
      }
    }
  });

  await assessment.save();

  // Return questions without correct answers
  const questionPreviews = finalQuestions.map(q => questionService.generateQuestionPreview(q));

  res.json({
    success: true,
    data: {
      assessmentId: assessment._id,
      questions: questionPreviews,
      totalQuestions: finalQuestions.length,
      timeLimit: 30 * finalQuestions.length // 30 seconds per question
    }
  });
});

/**
 * Submit cognitive metrics during assessment
 */
const submitMetrics = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;
  const { metrics } = req.body;

  if (!metrics || !Array.isArray(metrics)) {
    return res.status(400).json({
      success: false,
      message: 'Metrics array is required'
    });
  }

  // Validate each metric
  for (const metric of metrics) {
    const validation = cliService.validateMetrics(metric);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid metrics data',
        errors: validation.errors
      });
    }
  }

  // Find assessment
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found'
    });
  }

  if (assessment.status !== 'in-progress') {
    return res.status(400).json({
      success: false,
      message: 'Assessment is not in progress'
    });
  }

  // Add metrics to assessment
  assessment.metrics.push(...metrics);
  await assessment.save();

  res.json({
    success: true,
    message: 'Metrics recorded successfully',
    data: {
      totalMetrics: assessment.metrics.length
    }
  });
});

/**
 * Complete assessment and submit answers
 */
const completeAssessment = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;
  const { answers, confidence, timeSpent } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      message: 'Answers array is required'
    });
  }

  // Find assessment
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found'
    });
  }

  if (assessment.status !== 'in-progress') {
    return res.status(400).json({
      success: false,
      message: 'Assessment is not in progress'
    });
  }

  // Calculate test score
  let correctAnswers = 0;
  const processedAnswers = [];

  for (const answer of answers) {
    // For fallback questions, we need to handle them differently
    // since they might not exist in the database
    let question = null;
    let isCorrect = false;

    // Check if this is a fallback question (specific ObjectIds)
    const fallbackQuestionIds = [
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012', 
      '507f1f77bcf86cd799439013',
      '507f1f77bcf86cd799439014',
      '507f1f77bcf86cd799439015'
    ];
    
    if (fallbackQuestionIds.includes(answer.questionId)) {
      // For fallback questions, we'll use a simple scoring mechanism
      // or skip detailed validation since they're template questions
      isCorrect = true; // Assume correct for fallback questions
      console.log('Processing fallback question:', answer.questionId);
    } else {
      // For regular questions, get from database
      const questions = await questionService.getQuestionsForAssessment(
        assessment.courseId,
        assessment.videoId,
        1
      );
      question = questions.find(q => q._id.toString() === answer.questionId);

      if (!question) {
        console.log('Question not found:', answer.questionId);
        continue; // Skip invalid questions
      }

      isCorrect = answer.selectedAnswer === question.correctAnswer;
    }

    if (isCorrect) correctAnswers++;

    processedAnswers.push({
      questionId: answer.questionId,
      selectedAnswer: answer.selectedAnswer,
      isCorrect,
      timeSpent: answer.timeSpent || 30,
      confidence: answer.confidence || 3
    });

    // Update question statistics (only for non-fallback questions)
    if (!fallbackQuestionIds.includes(answer.questionId)) {
      await questionService.updateQuestionStats(answer.questionId, isCorrect);
    }
  }

  const testScore = Math.round((correctAnswers / answers.length) * 100);

  // Process cognitive metrics and compute CLI
  let cliResult;
  try {
    cliResult = await cliService.processMetrics(assessment.metrics || [], {
      timeSpent: timeSpent || 30 * answers.length
    });
  } catch (error) {
    console.error('CLI processing failed, using default values:', error.message);
    // Use default CLI values if processing fails
    cliResult = {
      cli: 50,
      classification: 'Moderate Load',
      avgMetrics: {
        avgOnScreen: 85,
        blinkRatePerMin: 15,
        headMovement: 0,
        eyeGazeStability: 85
      },
      totalMetrics: 0,
      processingTime: new Date().toISOString(),
      error: 'Used default values due to processing error'
    };
  }

  // Update assessment
  assessment.answers = processedAnswers;
  assessment.testScore = testScore;
  assessment.cli = cliResult.cli;
  assessment.cliClassification = cliResult.cliClassification;
  assessment.confidence = confidence || 3;
  assessment.timeSpent = timeSpent || 30 * answers.length;
  assessment.status = 'completed';
  assessment.metadata.sessionInfo.endTime = new Date();

  await assessment.save();

  // Generate feedback
  let feedback;
  try {
    feedback = await feedbackService.generateAssessmentFeedback(assessmentId, {
      userId: assessment.userId,
      courseId: assessment.courseId,
      testScore,
      cli: cliResult.cli,
      cliClassification: cliResult.cliClassification,
      confidence,
      answers: processedAnswers,
      avgMetrics: cliResult.avgMetrics,
      topic: 'General'
    });
  } catch (error) {
    console.error('Feedback generation failed:', error.message);
    console.log('Assessment completed without feedback');
    feedback = null;
  }

  // Update playlist progress
  try {
    console.log('📊 Updating playlist progress...');
    await playlistProgressService.addAssessmentAttempt(
      assessment.userId,
      assessment.courseId,
      assessment.videoId,
      {
        testScore,
        cli: cliResult.cli,
        cliClassification: cliResult.cliClassification,
        confidence,
        timeSpent: assessment.timeSpent,
        assessmentId: assessment._id
      }
    );
    console.log('✅ Playlist progress updated successfully');
  } catch (progressError) {
    console.error('Progress tracking error:', progressError.message);
    // Continue without progress tracking if it fails
  }

  res.json({
    success: true,
    message: 'Assessment completed successfully',
    data: {
      assessment: {
        id: assessment._id,
        testScore,
        cli: cliResult.cli,
        cliClassification: cliResult.cliClassification,
        confidence,
        timeSpent: assessment.timeSpent,
        correctAnswers,
        totalQuestions: answers.length,
        feedbackId: feedback ? feedback._id : null
      }
    }
  });
});

/**
 * Get assessment data (questions and basic info)
 */
const getAssessmentData = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;

  const assessment = await Assessment.findById(assessmentId)
    .populate('courseId', 'title thumbnail')
    .populate('userId', 'name email');

  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found'
    });
  }

  // Check if user can access this assessment
  if (req.user.role !== 'admin' && assessment.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Get questions for this assessment
  const questions = await questionService.getQuestionsForAssessment(
    assessment.courseId,
    assessment.videoId,
    10, // Default number of questions
    'intermediate'
  );

  if (questions.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No questions available for this assessment'
    });
  }

  const questionPreviews = questions.map(q => questionService.generateQuestionPreview(q));

  res.json({
    success: true,
    data: {
      assessmentId: assessment._id,
      questions: questionPreviews,
      totalQuestions: questions.length,
      timeLimit: 30 * questions.length, // 30 seconds per question
      status: assessment.status,
      course: assessment.courseId,
      user: assessment.userId
    }
  });
});

/**
 * Get assessment results
 */
const getAssessmentResults = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;

  const assessment = await Assessment.findById(assessmentId)
    .populate('courseId', 'title thumbnail')
    .populate('userId', 'name email');

  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found'
    });
  }

  // Check if user can access this assessment
  if (req.user.role !== 'admin' && assessment.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: {
      assessment: {
        id: assessment._id,
        course: assessment.courseId,
        user: assessment.userId,
        testScore: assessment.testScore,
        cli: assessment.cli,
        cliClassification: assessment.cliClassification,
        confidence: assessment.confidence,
        timeSpent: assessment.timeSpent,
        status: assessment.status,
        answers: assessment.answers,
        avgMetrics: assessment.avgMetrics,
        createdAt: assessment.createdAt
      }
    }
  });
});

/**
 * Get user's assessment history
 */
const getUserAssessments = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, status } = req.query;

  // Check if user can access this data
  if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const query = { userId };
  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const assessments = await Assessment.find(query)
    .populate('courseId', 'title thumbnail')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalAssessments = await Assessment.countDocuments(query);

  res.json({
    success: true,
    data: {
      assessments: assessments.map(assessment => ({
        id: assessment._id,
        course: assessment.courseId,
        testScore: assessment.testScore,
        cli: assessment.cli,
        cliClassification: assessment.cliClassification,
        confidence: assessment.confidence,
        timeSpent: assessment.timeSpent,
        status: assessment.status,
        createdAt: assessment.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalAssessments / parseInt(limit)),
        totalAssessments,
        hasNext: skip + assessments.length < totalAssessments,
        hasPrev: parseInt(page) > 1
      }
    }
  });
});

/**
 * Get assessment analytics
 */
const getAssessmentAnalytics = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if user can access this data
  if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Get user insights
  const insights = await cliService.getUserInsights(userId);

  // Get recent assessments
  const recentAssessments = await Assessment.find({
    userId,
    status: 'completed'
  })
  .populate('courseId', 'title')
  .sort({ createdAt: -1 })
  .limit(10);

  res.json({
    success: true,
    data: {
      insights,
      recentAssessments: recentAssessments.map(a => ({
        id: a._id,
        course: a.courseId,
        testScore: a.testScore,
        cli: a.cli,
        cliClassification: a.cliClassification,
        createdAt: a.createdAt
      }))
    }
  });
});

module.exports = {
  startAssessment,
  submitMetrics,
  completeAssessment,
  getAssessmentData,
  getAssessmentResults,
  getUserAssessments,
  getAssessmentAnalytics
};
