import mongoose from 'mongoose';

const TopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  sourceUrl: { type: String, required: true },
  sourceName: { type: String, required: true },
  publishedAt: { type: Date },
  discoveredAt: { type: Date, default: Date.now },
  editorialScore: { type: Number },
  editorialDecision: { type: String, enum: ['publish', 'reject'] },
  editorialReason: { type: String },
  agentId: { type: String, required: true }
});

export default mongoose.model('Topic', TopicSchema);
