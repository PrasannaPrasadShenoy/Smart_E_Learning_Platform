const Notes = require('../models/Notes');
const geminiService = require('./geminiService');
const assemblyaiService = require('./assemblyaiService');

class NotesService {
  /**
   * Generate comprehensive notes for a video
   * @param {string} userId - User ID
   * @param {string} videoId - Video ID
   * @param {Object} videoData - Video information
   * @returns {Promise<Object>} Generated notes
   */
  async generateNotes(userId, videoId, videoData) {
    try {
      console.log(`📝 Starting notes generation for video: ${videoId}`);
      const startTime = Date.now();

      // Check if notes already exist
      const existingNotes = await Notes.findOne({ userId, videoId });
      if (existingNotes) {
        console.log('📋 Notes already exist for this video');
        return existingNotes;
      }

      // Step 1: Get transcript
      console.log('🎬 Step 1: Getting video transcript...');
      const transcriptData = await assemblyaiService.getTranscript(videoId);
      
      if (!transcriptData || !transcriptData.transcript) {
        throw new Error('No transcript available for this video');
      }

      console.log(`✅ Transcript obtained: ${transcriptData.wordCount} words`);
      console.log(`📝 Transcript preview: ${transcriptData.transcript.substring(0, 200)}...`);
      console.log(`🌐 Transcript language: ${transcriptData.language}`);
      console.log(`📊 Transcript source: ${transcriptData.source}`);

      // Step 2: Generate short notes
      console.log('📝 Step 2: Generating short notes...');
      const shortNotes = await this.generateShortNotes(transcriptData.transcript, videoData);

      // Step 3: Generate detailed notes
      console.log('📚 Step 3: Generating detailed notes...');
      const detailedNotes = await this.generateDetailedNotes(transcriptData.transcript, videoData);

      // Step 4: Calculate read times
      const shortNotesWordCount = shortNotes.split(' ').length;
      const detailedNotesWordCount = detailedNotes.split(' ').length;
      const estimatedReadTime = {
        shortNotes: Math.ceil(shortNotesWordCount / 200), // 200 words per minute
        detailedNotes: Math.ceil(detailedNotesWordCount / 200)
      };

       // Step 5: Create notes document
       const notes = new Notes({
         userId,
         videoId,
         videoTitle: videoData.title || 'Untitled Video',
         videoThumbnail: videoData.thumbnail || '',
         videoDuration: this.parseVideoDuration(videoData.duration),
         transcript: transcriptData.transcript,
         transcriptLanguage: transcriptData.language || 'en',
         shortNotes,
         detailedNotes,
         estimatedReadTime,
         metadata: {
           generatedBy: 'gemini',
           confidence: 0.9,
           generationTime: Math.round((Date.now() - startTime) / 1000),
           wordCount: {
             shortNotes: shortNotesWordCount,
             detailedNotes: detailedNotesWordCount
           }
         }
       });

      await notes.save();
      console.log(`✅ Notes generated and saved successfully in ${Math.round((Date.now() - startTime) / 1000)}s`);

      return notes;
    } catch (error) {
      console.error('❌ Error generating notes:', error);
      throw error;
    }
  }

  /**
   * Generate short notes with key points
   */
  async generateShortNotes(transcript, videoData) {
    try {
      console.log(`📝 Generating short notes from transcript (${transcript.length} characters)`);
      console.log(`📝 Transcript sample: ${transcript.substring(0, 100)}...`);
      
      // Use the Gemini service method which already handles the transcript properly
      const response = await geminiService.generateShortNotes(transcript, 'en');
      
      if (!response || response.trim().length < 50) {
        console.warn('Short notes response too short, using fallback');
        return `Short Notes for: ${videoData.title || 'Educational Video'}\n\nKey Points:\n• Main concepts covered in the video\n• Important takeaways and insights\n• Practical applications discussed\n\nNote: Detailed notes generation failed. Please try again.`;
      }
      
      console.log(`✅ Short notes generated successfully (${response.length} characters)`);
      return response;
    } catch (error) {
      console.error('Error generating short notes:', error);
      return `Short Notes for: ${videoData.title || 'Educational Video'}\n\nKey Points:\n• Main concepts covered in the video\n• Important takeaways and insights\n• Practical applications discussed\n\nNote: Short notes generation failed. Please try again.`;
    }
  }

  /**
   * Generate detailed comprehensive notes
   */
  async generateDetailedNotes(transcript, videoData) {
    try {
      console.log(`📚 Generating detailed notes from transcript (${transcript.length} characters)`);
      console.log(`📚 Transcript sample: ${transcript.substring(0, 100)}...`);
      
      // Use the Gemini service method which already handles the transcript properly
      const response = await geminiService.generateDetailedNotes(transcript);
      
      if (!response || response.trim().length < 100) {
        console.warn('Detailed notes response too short, using fallback');
        return `Detailed Notes for: ${videoData.title || 'Educational Video'}\n\nComprehensive Analysis:\n\n1. Main Content Summary:\n   • Overview of topics covered\n   • Key concepts and definitions\n   • Important methodologies discussed\n\n2. Additional Insights:\n   • Best practices and recommendations\n   • Common pitfalls to avoid\n   • Advanced concepts and applications\n\n3. Practical Applications:\n   • Real-world examples\n   • Step-by-step processes\n   • Implementation strategies\n\n4. Related Topics:\n   • Complementary concepts\n   • Further learning resources\n   • Advanced study areas\n\nNote: Detailed notes generation failed. Please try again.`;
      }
      
      console.log(`✅ Detailed notes generated successfully (${response.length} characters)`);
      return response;
    } catch (error) {
      console.error('Error generating detailed notes:', error);
      return `Detailed Notes for: ${videoData.title || 'Educational Video'}\n\nComprehensive Analysis:\n\n1. Main Content Summary:\n   • Overview of topics covered\n   • Key concepts and definitions\n   • Important methodologies discussed\n\n2. Additional Insights:\n   • Best practices and recommendations\n   • Common pitfalls to avoid\n   • Advanced concepts and applications\n\n3. Practical Applications:\n   • Real-world examples\n   • Step-by-step processes\n   • Implementation strategies\n\n4. Related Topics:\n   • Complementary concepts\n   • Further learning resources\n   • Advanced study areas\n\nNote: Detailed notes generation failed. Please try again.`;
    }
  }


   /**
    * Parse video duration from various formats
    */
   parseVideoDuration(duration) {
     if (!duration) return 0;
     
     // If it's already a number, return it
     if (typeof duration === 'number') return duration;
     
     // If it's a string, try to parse it
     if (typeof duration === 'string') {
       // Handle ISO 8601 format (PT15M33S, PT1H2M3S, etc.)
       if (duration.startsWith('PT')) {
         const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
         if (match) {
           const hours = parseInt(match[1] || '0');
           const minutes = parseInt(match[2] || '0');
           const seconds = parseInt(match[3] || '0');
           return hours * 3600 + minutes * 60 + seconds;
         }
       }
       
       // Handle simple number strings
       const num = parseInt(duration);
       if (!isNaN(num)) return num;
     }
     
     return 0;
   }

   /**
    * Get notes for a video
    */
   async getNotes(userId, videoId) {
    try {
      const notes = await Notes.findOne({ userId, videoId });
      return notes;
    } catch (error) {
      console.error('Error getting notes:', error);
      throw error;
    }
  }

  /**
   * Get all user notes
   */
  async getUserNotes(userId, limit = 20, skip = 0) {
    try {
      const notes = await Notes.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
      
      return notes;
    } catch (error) {
      console.error('Error getting user notes:', error);
      throw error;
    }
  }

  /**
   * Delete notes
   */
  async deleteNotes(userId, videoId) {
    try {
      const result = await Notes.findOneAndDelete({ userId, videoId });
      return result;
    } catch (error) {
      console.error('Error deleting notes:', error);
      throw error;
    }
  }
}

module.exports = new NotesService();
