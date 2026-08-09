import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true },
  personaName: { type: String, required: true },
  personaDomain: { type: String, required: true },
  minimumScore: { type: Number, default: 80, min: 0, max: 100 },
  status: { type: String, default: 'running' },
  isCycleRunning: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastCycleAt: { type: Date }
});

export default mongoose.model('Agent', AgentSchema);
