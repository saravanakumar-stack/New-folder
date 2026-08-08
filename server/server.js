import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import agentRoutes from './routes/agentRoutes.js';
import { startScheduler } from './scheduler/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/agent', agentRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'SentinelAI backend running' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SentinelAI backend listening on port ${PORT}`);
    });
    startScheduler();
  })
  .catch((error) => {
    console.error('Server startup failed', error);
    process.exit(1);
  });
