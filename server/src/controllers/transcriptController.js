const { validationResult } = require('express-validator');
const Transcript = require('../models/Transcript');
const assemblyaiService = require('../services/assemblyaiService');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Get transcript for a video
 */
const getTranscript = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({
      success: false,
      message: 'Video ID is required'
    });
  }

  try {
    console.log(`📄 Fetching transcript for video: ${videoId}`);
    
    // Try to get from cache first
    const cachedTranscript = await Transcript.findOne({ videoId });
    
    if (cachedTranscript && cachedTranscript.transcript && cachedTranscript.transcript.length > 50) {
      console.log('✅ Using cached transcript');
      await cachedTranscript.touchLastUsed();
      
      return res.json({
        success: true,
        data: {
          videoId: cachedTranscript.videoId,
          transcript: cachedTranscript.transcript,
          language: cachedTranscript.language,
          wordCount: cachedTranscript.wordCount,
          duration: cachedTranscript.duration,
          source: cachedTranscript.source,
          hasTranscript: true,
          cached: true,
          lastUsed: cachedTranscript.metadata.lastUsedAt
        }
      });
    }

    // If not in cache, generate new transcript
    console.log('🔄 Transcript not in cache, generating new one...');
    const transcriptData = await assemblyaiService.getTranscriptWithFallback(videoId);

    res.json({
      success: true,
      data: {
        videoId: transcriptData.videoId || videoId,
        transcript: transcriptData.transcript,
        language: transcriptData.language,
        wordCount: transcriptData.wordCount,
        duration: transcriptData.duration,
        source: transcriptData.source,
        hasTranscript: transcriptData.hasTranscript,
        cached: false
      }
    });

  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transcript',
      error: error.message
    });
  }
});

/**
 * Get all cached transcripts for a user (optional filtering)
 */
const getCachedTranscripts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, source } = req.query;

  try {
    const skip = (page - 1) * limit;
    const filter = {};
    
    if (source) {
      filter.source = source;
    }

    const transcripts = await Transcript.find(filter)
      .select('videoId language wordCount duration source metadata.lastUsedAt createdAt')
      .sort({ 'metadata.lastUsedAt': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Transcript.countDocuments(filter);

    res.json({
      success: true,
      data: {
        transcripts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching cached transcripts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cached transcripts',
      error: error.message
    });
  }
});

/**
 * Delete a cached transcript
 */
const deleteTranscript = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({
      success: false,
      message: 'Video ID is required'
    });
  }

  try {
    const result = await Transcript.findOneAndDelete({ videoId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Transcript not found'
      });
    }

    res.json({
      success: true,
      message: 'Transcript deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting transcript:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transcript',
      error: error.message
    });
  }
});

/**
 * Verify transcript storage for a video
 */
const verifyTranscript = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({
      success: false,
      message: 'Video ID is required'
    });
  }

  try {
    const verification = await assemblyaiService.verifyTranscriptStorage(videoId);
    
    res.json({
      success: true,
      data: verification
    });

  } catch (error) {
    console.error('Error verifying transcript:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify transcript',
      error: error.message
    });
  }
});

/**
 * Get transcript statistics
 */
const getTranscriptStats = asyncHandler(async (req, res) => {
  try {
    const stats = await Transcript.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          totalWords: { $sum: '$wordCount' },
          avgWords: { $avg: '$wordCount' }
        }
      }
    ]);

    const totalTranscripts = await Transcript.countDocuments();
    const totalWords = await Transcript.aggregate([
      { $group: { _id: null, total: { $sum: '$wordCount' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalTranscripts,
        totalWords: totalWords[0]?.total || 0,
        bySource: stats,
        recentActivity: await Transcript.find()
          .select('videoId source metadata.lastUsedAt')
          .sort({ 'metadata.lastUsedAt': -1 })
          .limit(10)
      }
    });

  } catch (error) {
    console.error('Error fetching transcript stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transcript statistics',
      error: error.message
    });
  }
});

module.exports = {
  getTranscript,
  getCachedTranscripts,
  deleteTranscript,
  verifyTranscript,
  getTranscriptStats
};
