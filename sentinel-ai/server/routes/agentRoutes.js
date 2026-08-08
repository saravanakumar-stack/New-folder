import express from 'express';
import crypto from 'crypto';
import Agent from '../models/Agent.js';
import Topic from '../models/Topic.js';
import PublishedPost from '../models/PublishedPost.js';
import RejectedTopic from '../models/RejectedTopic.js';
import ActivityLog from '../models/ActivityLog.js';
import { runAutonomousCycle } from '../services/autonomousAgent.js';

const router = express.Router();

router.post('/init', async (req, res) => {
  try {
    const { persona } = req.body;
    if (!persona || !persona.name || !persona.domain) {
      return res.status(400).json({ error: 'persona.name and persona.domain are required' });
    }

    let agent = await Agent.findOne({ personaName: persona.name, personaDomain: persona.domain });
    if (!agent) {
      const agentId = crypto.randomUUID();
      agent = await Agent.create({
        agentId,
        personaName: persona.name,
        personaDomain: persona.domain,
        status: 'running',
        lastCycleAt: new Date()
      });
      await ActivityLog.create({
        agentId: agent.agentId,
        eventType: 'AGENT_INITIALIZED',
        message: 'Agent initialized and autonomous processing started.'
      });
      await runAutonomousCycle(agent.agentId);
      return res.status(201).json({ agentId: agent.agentId });
    }

    if (agent.status !== 'running') {
      agent.status = 'running';
      await agent.save();
      runAutonomousCycle(agent.agentId);
    }

    return res.json({ agentId: agent.agentId });
  } catch (error) {
    console.error('Initialization error', error);
    return res.status(500).json({ error: 'Failed to initialize agent' });
  }
});

router.get('/feed', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const posts = await PublishedPost.find({ agentId }).sort({ createdAt: -1 });
    return res.json({ posts: posts.map((post) => ({
      id: post._id,
      createdAt: post.createdAt,
      text: post.text,
      whySelected: post.whySelected,
      whyRelevant: post.whyRelevant,
      sources: post.sources,
      editorialScore: post.editorialScore
    })) });
  } catch (error) {
    console.error('Feed error', error);
    return res.status(500).json({ error: 'Unable to fetch feed' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const agent = await Agent.findOne({ agentId });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    return res.json({
      agentId: agent.agentId,
      status: agent.status,
      personaName: agent.personaName,
      personaDomain: agent.personaDomain,
      lastCycleAt: agent.lastCycleAt,
      isCycleRunning: agent.isCycleRunning
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch status' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const topicsDiscovered = await Topic.countDocuments({ agentId });
    const published = await PublishedPost.countDocuments({ agentId });
    const rejected = await RejectedTopic.countDocuments({ agentId });
    const memory = await Topic.countDocuments({ agentId });

    return res.json({ topicsDiscovered, published, rejected, memory });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch stats' });
  }
});

router.get('/rejections', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const rejects = await RejectedTopic.find({ agentId }).sort({ createdAt: -1 }).limit(12).populate('topicId');
    return res.json({ rejects: rejects.map((entry) => ({
      id: entry._id,
      topic: entry.topicId?.title || 'Unknown topic',
      score: entry.score,
      reason: entry.reason,
      createdAt: entry.createdAt
    })) });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch rejections' });
  }
});

router.get('/activity', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const activity = await ActivityLog.find({ agentId }).sort({ createdAt: -1 }).limit(20);
    return res.json({ activity });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch activity logs' });
  }
});

router.get('/memory', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const published = await Topic.find({ agentId, editorialDecision: 'publish' }).sort({ publishedAt: -1 }).limit(5);
    const rejected = await RejectedTopic.find({ agentId }).sort({ createdAt: -1 }).limit(5).populate('topicId');
    return res.json({ published, rejected });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch memory data' });
  }
});

export default router;
