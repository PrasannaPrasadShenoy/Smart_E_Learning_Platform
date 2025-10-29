const express = require('express');
const router = express.Router();
const playlistProgressService = require('../services/playlistProgressService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { authenticateToken } = require('../middlewares/authMiddleware');

/**
 * Get playlist progress for a user
 * GET /api/playlist-progress/:playlistId
 */
router.get('/:playlistId', authenticateToken, asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const userId = req.user._id;

  const progress = await playlistProgressService.getUserPlaylistProgress(userId, playlistId);

  if (!progress) {
    return res.status(404).json({
      success: false,
      message: 'Playlist progress not found'
    });
  }

  res.json({
    success: true,
    data: { progress }
  });
}));

/**
 * Get all user's playlist progress
 * GET /api/playlist-progress
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const progress = await playlistProgressService.getAllUserProgress(userId);

  res.json({
    success: true,
    data: { progress }
  });
}));

/**
 * Update video progress in a playlist
 * PUT /api/playlist-progress/:playlistId/video/:videoId
 */
router.put('/:playlistId/video/:videoId', authenticateToken, asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user._id;
  const progressData = req.body;

  const progress = await playlistProgressService.updateVideoProgress(
    userId,
    playlistId,
    videoId,
    progressData
  );

  res.json({
    success: true,
    data: { progress }
  });
}));

/**
 * Get video progress within a playlist
 * GET /api/playlist-progress/:playlistId/video/:videoId
 */
router.get('/:playlistId/video/:videoId', authenticateToken, asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user._id;

  const videoProgress = await playlistProgressService.getVideoProgress(userId, playlistId, videoId);

  if (!videoProgress) {
    return res.status(404).json({
      success: false,
      message: 'Video progress not found'
    });
  }

  res.json({
    success: true,
    data: { videoProgress }
  });
}));

/**
 * Update playlist with video data
 * POST /api/playlist-progress/:playlistId/videos
 */
router.post('/:playlistId/videos', authenticateToken, asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const userId = req.user._id;
  const { videos, playlistData } = req.body;

  const progress = await playlistProgressService.updatePlaylistVideos(
    userId,
    playlistId,
    videos
  );

  res.json({
    success: true,
    data: { progress }
  });
}));

/**
 * Get user progress statistics
 * GET /api/playlist-progress/stats/overview
 */
router.get('/stats/overview', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = await playlistProgressService.getUserProgressStats(userId);

  res.json({
    success: true,
    data: { stats }
  });
}));

module.exports = router;
