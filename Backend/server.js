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
app.use(express.static(path.resolve(__dirname, '../Frontend/legacy')));

app.get('/api-status', (req, res) => {
  res.json({ status: 'SentinelAI backend running' });
});

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Initial database connection failed. Server starting in degraded mode.');
  }

  const server = app.listen(PORT, () => {
    console.log(`SentinelAI backend listening on port ${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[ERROR] Port ${PORT} is already in use. Terminate the process using port ${PORT} or check running background instances.`);
    } else {
      console.error(`[ERROR] Server error:`, error.message);
    }
  });

  startScheduler();
};

startServer();
