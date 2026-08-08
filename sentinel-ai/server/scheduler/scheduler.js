import cron from 'node-cron';
import Agent from '../models/Agent.js';
import { runAutonomousCycle } from '../services/autonomousAgent.js';

export const startScheduler = () => {
  cron.schedule('*/1 * * * *', async () => {
    try {
      const agents = await Agent.find({ status: 'running' });
      for (const agent of agents) {
        await runAutonomousCycle(agent.agentId);
      }
    } catch (error) {
      console.error('Scheduler error', error);
    }
  });
};
