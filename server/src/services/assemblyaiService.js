const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('../config/env');
const Transcript = require('../models/Transcript');

class AssemblyAIService {
  constructor() {
    this.apiKey = config.assemblyaiApiKey;
    this.baseUrl = 'https://api.assemblyai.com/v2';
    
    if (!this.apiKey) {
      console.warn('⚠️  ASSEMBLYAI_API_KEY not found in environment variables');
    } else {
      console.log('✅ AssemblyAI API key found, initializing service...');
    }
  }

  /**
   * Extract audio from YouTube video using yt-dlp
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<string>} Path to extracted audio file
   */
  async extractAudioFromYouTube(videoId) {
    return new Promise((resolve, reject) => {
      const tempDir = path.join(__dirname, '../../temp');
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const audioPath = path.join(tempDir, `${videoId}.mp3`);
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

      console.log(`Extracting audio from YouTube video: ${videoId}`);

      // Try different yt-dlp commands based on system
      const ytdlpCommands = [
        'yt-dlp',           // Global installation
        'python -m yt_dlp', // Python module
        'python3 -m yt_dlp' // Python3 module
      ];

      // Set ffmpeg location for Windows
      const ffmpegPath = 'C:\\ffmpeg\\ffmpeg-8.0-essentials_build\\bin';

      let ytdlpProcess = null;
      let commandUsed = '';

      // Try each command until one works
      for (const cmd of ytdlpCommands) {
        try {
          const [command, ...args] = cmd.split(' ');
          const fullArgs = [
            ...args,
            '--extract-audio',
            '--audio-format', 'mp3',
            '--ffmpeg-location', ffmpegPath,
            '--output', audioPath,
            youtubeUrl
          ];

          console.log(`Trying command: ${command} ${fullArgs.join(' ')}`);
          
          ytdlpProcess = spawn(command, fullArgs);
          commandUsed = cmd;
          break;
        } catch (error) {
          console.log(`Command ${cmd} failed, trying next...`);
          continue;
        }
      }

      if (!ytdlpProcess) {
        reject(new Error('yt-dlp not found in any of the expected locations'));
        return;
      }

      ytdlpProcess.stdout.on('data', (data) => {
        console.log(`yt-dlp stdout: ${data}`);
      });

      ytdlpProcess.stderr.on('data', (data) => {
        console.log(`yt-dlp stderr: ${data}`);
      });

      ytdlpProcess.on('close', (code) => {
        if (code === 0 && fs.existsSync(audioPath)) {
          console.log(`Audio extracted successfully using ${commandUsed}: ${audioPath}`);
          resolve(audioPath);
        } else {
          console.error(`yt-dlp process exited with code ${code} using command: ${commandUsed}`);
          reject(new Error(`Failed to extract audio from YouTube video using ${commandUsed}`));
        }
      });

      ytdlpProcess.on('error', (error) => {
        console.error(`yt-dlp error with ${commandUsed}: ${error}`);
        reject(new Error(`yt-dlp not found or failed to execute with command: ${commandUsed}`));
      });
    });
  }

  /**
   * Upload audio file to AssemblyAI
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<string>} Upload URL
   */
  async uploadAudio(audioPath) {
    try {
      console.log(`Uploading audio file: ${audioPath}`);
      
      const audioBuffer = fs.readFileSync(audioPath);
      
      const response = await axios.post(`${this.baseUrl}/upload`, audioBuffer, {
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/octet-stream'
        }
      });

      console.log('Audio uploaded successfully');
      return response.data.upload_url;
    } catch (error) {
      console.error('Error uploading audio:', error.response?.data || error.message);
      throw new Error('Failed to upload audio to AssemblyAI');
    }
  }

  /**
   * Create transcription request with AssemblyAI
   * @param {string} audioUrl - Uploaded audio URL
   * @returns {Promise<string>} Transcript ID
   */
  async createTranscript(audioUrl) {
    try {
      console.log('Creating transcription request...');
      
      const response = await axios.post(`${this.baseUrl}/transcript`, {
        audio_url: audioUrl,
        language_detection: true,
        summarization: true,
        summary_model: 'informative',
        summary_type: 'paragraph',
        auto_highlights: true,
        sentiment_analysis: true
      }, {
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Transcription request created: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error('Error creating transcription:', error.response?.data || error.message);
      throw new Error('Failed to create transcription request');
    }
  }

  /**
   * Poll for transcription completion
   * @param {string} transcriptId - Transcript ID
   * @returns {Promise<Object>} Completed transcript data
   */
  async pollTranscript(transcriptId) {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        console.log(`Polling transcript ${transcriptId} (attempt ${attempts + 1}/${maxAttempts})`);
        
        const response = await axios.get(`${this.baseUrl}/transcript/${transcriptId}`, {
          headers: {
            'Authorization': this.apiKey
          }
        });

        const data = response.data;
        console.log(`Transcript status: ${data.status}`);

        if (data.status === 'completed') {
          console.log('Transcription completed successfully');
          return data;
        } else if (data.status === 'error') {
          throw new Error(`Transcription failed: ${data.error}`);
        }

        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;

      } catch (error) {
        console.error('Error polling transcript:', error.response?.data || error.message);
        throw new Error('Failed to poll transcription status');
      }
    }

    throw new Error('Transcription timeout - took too long to complete');
  }

  /**
   * Get transcript for a YouTube video using AssemblyAI
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Transcript data
   */
  async getTranscript(videoId) {
    try {
      if (!this.apiKey) {
        throw new Error('AssemblyAI API key not configured');
      }

      console.log(`Getting transcript for video: ${videoId}`);

      // Cache: check existing transcript first
      try {
        const cached = await Transcript.findOne({ videoId });
        if (cached && cached.transcript && cached.transcript.length > 50) {
          console.log('✅ Using cached transcript from database');
          await cached.touchLastUsed();
          return {
            transcript: cached.transcript,
            language: cached.language || 'en',
            wordCount: cached.wordCount || (cached.transcript.split(' ').length),
            duration: cached.duration || 0,
            hasTranscript: true,
            summary: '',
            highlights: [],
            sentiment: [],
            source: cached.source || 'cache'
          };
        }
      } catch (cacheErr) {
        console.warn('⚠️ Transcript cache lookup failed:', cacheErr.message);
      }

      // Step 1: Extract audio from YouTube
      const audioPath = await this.extractAudioFromYouTube(videoId);

      // Step 2: Upload audio to AssemblyAI
      const uploadUrl = await this.uploadAudio(audioPath);

      // Step 3: Create transcription request
      const transcriptId = await this.createTranscript(uploadUrl);

      // Step 4: Poll for completion
      const result = await this.pollTranscript(transcriptId);

      // Step 5: Clean up temporary audio file
      try {
        fs.unlinkSync(audioPath);
        console.log('Temporary audio file cleaned up');
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary file:', cleanupError.message);
      }

      // Step 6: Format result for ILA
      const transcriptData = {
        transcript: result.text,
        language: result.language_code || 'en',
        wordCount: result.text.split(' ').length,
        duration: result.audio_duration || 0,
        hasTranscript: true,
        summary: result.summary || '',
        highlights: result.auto_highlights?.results || [],
        sentiment: result.sentiment_analysis_results || [],
        source: 'assemblyai'
      };

      console.log('AssemblyAI transcript processed successfully:', {
        wordCount: transcriptData.wordCount,
        language: transcriptData.language,
        hasSummary: !!transcriptData.summary,
        duration: transcriptData.duration
      });

      // Save/update cache
      try {
        const savedTranscript = await Transcript.findOneAndUpdate(
          { videoId },
          {
            videoId,
            transcript: transcriptData.transcript,
            language: transcriptData.language,
            wordCount: transcriptData.wordCount,
            duration: transcriptData.duration,
            source: 'assemblyai',
            'metadata.lastUsedAt': new Date()
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('🗄️ Transcript cached in database:', {
          videoId: savedTranscript.videoId,
          transcriptLength: savedTranscript.transcript.length,
          wordCount: savedTranscript.wordCount,
          language: savedTranscript.language
        });
      } catch (saveErr) {
        console.warn('⚠️ Failed to cache transcript:', saveErr.message);
      }

      return transcriptData;

    } catch (error) {
      console.error('AssemblyAI transcript error:', error.message);
      throw new Error(`Failed to get transcript: ${error.message}`);
    }
  }

  /**
   * Get transcript with fallback to YouTube API
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Transcript data
   */
  async getTranscriptWithFallback(videoId) {
    try {
      // Try AssemblyAI first
      return await this.getTranscript(videoId);
    } catch (error) {
      console.error('AssemblyAI failed, trying YouTube fallback:', error.message);
      
      // Fallback to YouTube transcript API
      const transcriptData = await this.getYouTubeTranscriptFallback(videoId);

      // Save/update cache from fallback as well
      try {
        const savedTranscript = await Transcript.findOneAndUpdate(
          { videoId },
          {
            videoId,
            transcript: transcriptData.transcript,
            language: transcriptData.language,
            wordCount: transcriptData.wordCount,
            duration: transcriptData.duration,
            source: transcriptData.source || 'youtube_fallback',
            'metadata.lastUsedAt': new Date()
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('🗄️ Transcript (fallback) cached in database:', {
          videoId: savedTranscript.videoId,
          transcriptLength: savedTranscript.transcript.length,
          wordCount: savedTranscript.wordCount,
          language: savedTranscript.language,
          source: savedTranscript.source
        });
      } catch (saveErr) {
        console.warn('⚠️ Failed to cache fallback transcript:', saveErr.message);
      }

      return transcriptData;
    }
  }

  /**
   * Get YouTube transcript as fallback (no audio extraction needed)
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Transcript data
   */
  async getYouTubeTranscriptFallback(videoId) {
    try {
      console.log('Using YouTube transcript API as fallback...');
      const { YoutubeTranscript } = require('youtube-transcript');
      
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      const fullTranscript = transcript
        .map(segment => segment.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Detect language from transcript
      const detectedLanguage = this.detectLanguage(fullTranscript);

      const wordCount = fullTranscript.split(' ').length;
      
      console.log('YouTube transcript fallback successful:', {
        wordCount: wordCount,
        language: detectedLanguage,
        transcriptLength: fullTranscript.length
      });

      // If transcript is too short, still return it but mark as insufficient
      if (wordCount < 10 || fullTranscript.length < 50) {
        console.log('YouTube transcript too short, but returning it anyway');
        return {
          transcript: fullTranscript,
          language: detectedLanguage,
          wordCount: wordCount,
          duration: fullTranscript.length,
          hasTranscript: true,
          summary: '',
          source: 'youtube_fallback_short'
        };
      }

      return {
        transcript: fullTranscript,
        language: detectedLanguage,
        wordCount: wordCount,
        duration: fullTranscript.length,
        hasTranscript: true,
        summary: '',
        source: 'youtube_fallback'
      };
    } catch (fallbackError) {
      console.error('YouTube fallback also failed:', fallbackError.message);
      throw new Error('Both AssemblyAI and YouTube transcript failed');
    }
  }

  /**
   * Verify transcript storage and integrity
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyTranscriptStorage(videoId) {
    try {
      const transcript = await Transcript.findOne({ videoId });
      
      if (!transcript) {
        return {
          exists: false,
          message: 'Transcript not found in database'
        };
      }

      const verification = {
        exists: true,
        videoId: transcript.videoId,
        transcriptLength: transcript.transcript.length,
        wordCount: transcript.wordCount,
        language: transcript.language,
        source: transcript.source,
        createdAt: transcript.createdAt,
        lastUsed: transcript.metadata.lastUsedAt,
        isValid: transcript.transcript.length > 50 && transcript.wordCount > 10,
        issues: []
      };

      // Check for potential issues
      if (transcript.transcript.length < 50) {
        verification.issues.push('Transcript too short');
      }
      if (transcript.wordCount < 10) {
        verification.issues.push('Word count too low');
      }
      if (!transcript.language) {
        verification.issues.push('Language not detected');
      }

      return verification;
    } catch (error) {
      console.error('Error verifying transcript storage:', error);
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Detect language from transcript text
   * @param {string} text - Transcript text
   * @returns {string} Detected language code
   */
  detectLanguage(text) {
    const languagePatterns = {
      'en': /[a-zA-Z]/g,
      'hi': /[\u0900-\u097F]/g,
      'zh': /[\u4E00-\u9FFF]/g,
      'ja': /[\u3040-\u309F\u30A0-\u30FF]/g,
      'ko': /[\uAC00-\uD7AF]/g,
      'ar': /[\u0600-\u06FF]/g,
      'es': /[ñáéíóúü]/gi,
      'fr': /[àâäéèêëïîôöùûüÿç]/gi,
      'de': /[äöüß]/gi,
      'ru': /[\u0400-\u04FF]/g,
      'pt': /[ãõç]/gi,
      'it': /[àèéìíîòóù]/gi,
    };

    const scores = {};
    
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      const matches = text.match(pattern);
      scores[lang] = matches ? matches.length : 0;
    }

    const detectedLang = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    )[0];

    return scores[detectedLang] > 0 ? detectedLang : 'en';
  }
}

module.exports = new AssemblyAIService();
