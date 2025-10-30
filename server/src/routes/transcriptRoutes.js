const express = require('express');
const { body } = require('express-validator');
const {
  getTranscript,
  getCachedTranscripts,
  deleteTranscript,
  verifyTranscript,
  getTranscriptStats
} = require('../controllers/transcriptController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/transcripts/:videoId
 * @desc    Get transcript for a specific video
 * @access  Private
 */
router.get('/:videoId', getTranscript);

/**
 * @route   GET /api/transcripts
 * @desc    Get all cached transcripts with pagination
 * @access  Private
 * @query   page, limit, source
 */
router.get('/', getCachedTranscripts);

/**
 * @route   DELETE /api/transcripts/:videoId
 * @desc    Delete a cached transcript
 * @access  Private
 */
router.delete('/:videoId', deleteTranscript);

/**
 * @route   GET /api/transcripts/:videoId/verify
 * @desc    Verify transcript storage and integrity
 * @access  Private
 */
router.get('/:videoId/verify', verifyTranscript);

/**
 * @route   GET /api/transcripts/stats/overview
 * @desc    Get transcript statistics
 * @access  Private
 */
router.get('/stats/overview', getTranscriptStats);

module.exports = router;
