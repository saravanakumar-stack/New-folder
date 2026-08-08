import mongoose from 'mongoose';

const PublishedPostSchema = new mongoose.Schema({
  agentId: { type: String, required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Topic' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  whySelected: { type: String, required: true },
  whyRelevant: { type: String, required: true },
  sources: [{ type: String, required: true }],
  editorialScore: { type: Number, required: true }
});

export default mongoose.model('PublishedPost', PublishedPostSchema);
