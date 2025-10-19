const express = require('express');
const { query, param } = require('express-validator');
const {
  searchPlaylists,
  getPlaylistDetails,
  getVideoTranscript,
  getCourse,
  getCourses,
  getVideoDetails,
  searchCourses,
  savePlaylist,
  getVideoContext
} = require('../controllers/youtubeController');
const { authenticateToken, optionalAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

// Validation rules
const searchValidation = [
  query('query')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters long'),
  query('maxResults')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Max results must be between 1 and 50')
];

const playlistIdValidation = [
  param('playlistId')
    .notEmpty()
    .withMessage('Playlist ID is required')
];

const videoIdValidation = [
  param('videoId')
    .notEmpty()
    .withMessage('Video ID is required')
];

const courseIdValidation = [
  param('courseId')
    .notEmpty()
    .withMessage('Course ID is required')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['title', 'createdAt', 'difficulty', 'category'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Routes
router.get('/search', searchValidation, searchPlaylists);
router.get('/playlist/:playlistId', playlistIdValidation, getPlaylistDetails);
router.get('/video/:videoId/transcript', videoIdValidation, getVideoTranscript);
router.get('/course/:courseId', courseIdValidation, getCourse);
router.get('/courses', paginationValidation, getCourses);
router.get('/video/:videoId', videoIdValidation, getVideoDetails);
router.get('/video/:videoId/context', videoIdValidation, getVideoContext);
router.get('/search-courses', searchValidation, searchCourses);
router.post('/save-playlist', authenticateToken, savePlaylist);

module.exports = router;
