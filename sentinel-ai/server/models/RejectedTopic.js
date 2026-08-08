import mongoose from 'mongoose';

const RejectedTopicSchema = new mongoose.Schema({
  agentId: { type: String, required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Topic' },
  reason: { type: String, required: true },
  score: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('RejectedTopic', RejectedTopicSchema);
