import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import agentRoutes from './routes/agentRoutes.js';
import { startScheduler } from './scheduler/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');

dotenv.config({ path: envPath });

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
