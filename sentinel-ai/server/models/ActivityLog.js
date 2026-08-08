import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  agentId: { type: String, required: true },
  eventType: { type: String, required: true },
  message: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ActivityLog', ActivityLogSchema);
