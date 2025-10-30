const mongoose = require('mongoose');

const TranscriptSchema = new mongoose.Schema(
  {
    videoId: { type: String, required: true, index: true, unique: true },
    transcript: { type: String, required: true },
    language: { type: String, default: 'en' },
    wordCount: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    source: { type: String, enum: ['assemblyai', 'youtube', 'mock'], default: 'assemblyai' },
    metadata: {
      savedBy: { type: String, default: 'system' },
      lastUsedAt: { type: Date },
    },
  },
  { timestamps: true }
);

TranscriptSchema.methods.touchLastUsed = async function () {
  this.metadata.lastUsedAt = new Date();
  await this.save();
};

module.exports = mongoose.model('Transcript', TranscriptSchema);



