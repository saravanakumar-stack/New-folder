import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true },
  personaName: { type: String, required: true },
  personaDomain: { type: String, required: true },
  status: { type: String, default: 'running' },
  isCycleRunning: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastCycleAt: { type: Date }
});

export default mongoose.model('Agent', AgentSchema);
