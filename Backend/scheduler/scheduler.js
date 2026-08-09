import cron from 'node-cron';
import Agent from '../models/Agent.js';
import { runAutonomousCycle } from '../services/autonomousAgent.js';

export const startScheduler = () => {
  cron.schedule('*/1 * * * *', async () => {
    try {
      console.log('[SCHEDULER] Running scheduled autonomous cycle check.');
      const agents = await Agent.find({ status: 'running' });
      for (const agent of agents) {
        try {
          await runAutonomousCycle(agent.agentId);
        } catch (innerError) {
          console.error(`[SCHEDULER] Isolated agent cycle failure [ID: ${agent.agentId}]:`, innerError.message);
        }
      }
    } catch (error) {
      console.error('[SCHEDULER] Catastrophic scheduler loop failure:', error.message);
    }
  });
};
