const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getTeacherQuizzes,
  getQuiz,
  generateQuizKey,
  getQuizByKey,
  submitQuizAttempt,
  getQuizAnalytics,
  getTeacherQuizKeys,
  getStudentQuizHistory,
  getQuizAttemptDetails
} = require('../controllers/quizController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Teacher routes (require instructor/admin role)
router.post('/', requireRole('instructor', 'admin'), createQuiz);
router.get('/teacher/quizzes', requireRole('instructor', 'admin'), getTeacherQuizzes);
router.get('/teacher/keys', requireRole('instructor', 'admin'), getTeacherQuizKeys);
router.post('/teacher/generate-key', requireRole('instructor', 'admin'), generateQuizKey);
router.get('/teacher/:quizId/analytics', requireRole('instructor', 'admin'), getQuizAnalytics);

// Student routes (accessible to all authenticated users)
router.get('/student/history', getStudentQuizHistory);
router.get('/student/attempt/:attemptId', getQuizAttemptDetails);
router.get('/:quizId', getQuiz);
router.get('/key/:key', getQuizByKey);
router.post('/submit', submitQuizAttempt);

module.exports = router;

