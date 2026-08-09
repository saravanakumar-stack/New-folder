import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Agent from '../models/Agent.js';
import Topic from '../models/Topic.js';
import PublishedPost from '../models/PublishedPost.js';
import RejectedTopic from '../models/RejectedTopic.js';
import ActivityLog from '../models/ActivityLog.js';
import { runAutonomousCycle } from '../services/autonomousAgent.js';

const router = express.Router();

router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.warn(`[DATABASE] Request to ${req.originalUrl} rejected because DB is unavailable.`);
    return res.status(503).json({ error: 'Database temporarily unavailable' });
  }
  next();
});

router.post('/init', async (req, res) => {
  try {
    const { persona, minimumScore } = req.body;
    if (!persona || !persona.name || !persona.domain) {
      return res.status(400).json({ error: 'persona.name and persona.domain are required' });
    }

    const scoreValue = minimumScore !== undefined ? Math.max(0, Math.min(100, parseInt(minimumScore, 10))) : 80;

    let agent = await Agent.findOne({ personaName: persona.name, personaDomain: persona.domain });
    if (!agent) {
      const agentId = crypto.randomUUID();
      agent = await Agent.create({
        agentId,
        personaName: persona.name,
        personaDomain: persona.domain,
        minimumScore: scoreValue,
        status: 'running',
        lastCycleAt: new Date()
      });

      await ActivityLog.create({
        agentId,
        eventType: 'AGENT_INITIALIZED',
        message: `Agent initialized with minimum quality score ${scoreValue} and autonomous processing started.`
      });

      runAutonomousCycle(agentId);
      return res.status(201).json({ agentId });
    }

    if (agent.status !== 'running') {
      agent.status = 'running';
      agent.minimumScore = scoreValue;
      await agent.save();
      await ActivityLog.create({
        agentId: agent.agentId,
        eventType: 'AGENT_INITIALIZED',
        message: `Existing agent resumed running state with minimum quality score ${scoreValue}.`
      });
    }

    runAutonomousCycle(agent.agentId);
    return res.json({ agentId: agent.agentId });
  } catch (error) {
    console.error('Agent init error:', error.message);
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
    console.error('Feed error:', error.message);
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
      status: agent.status,
      persona: {
        name: agent.personaName,
        domain: agent.personaDomain
      },
      minimumScore: agent.minimumScore || 80
    });
  } catch (error) {
    console.error('Status error:', error.message);
    return res.status(500).json({ error: 'Unable to fetch status' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const discovered = await Topic.countDocuments({ agentId });
    const published = await PublishedPost.countDocuments({ agentId });
    const rejected = await RejectedTopic.countDocuments({ agentId });
    const memory = await Topic.countDocuments({ agentId });
    return res.json({ discovered, published, rejected, memory });
  } catch (error) {
    console.error('Stats error:', error.message);
    return res.status(500).json({ error: 'Unable to fetch stats' });
  }
});

router.get('/rejections', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const rejects = await RejectedTopic.find({ agentId }).sort({ createdAt: -1 }).limit(20).populate('topicId');
    return res.json({ rejects: rejects.map((entry) => ({
      id: entry._id,
      topic: entry.topicId?.title || 'Unknown topic',
      score: entry.score,
      reason: entry.reason,
      createdAt: entry.createdAt
    })) });
  } catch (error) {
    console.error('Rejections error:', error.message);
    return res.status(500).json({ error: 'Unable to fetch rejected topics' });
  }
});

router.get('/memory', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const publishedMemory = await Topic.find({ agentId, editorialDecision: 'publish' }).sort({ publishedAt: -1 }).limit(10);
    const rejectedMemory = await RejectedTopic.find({ agentId }).sort({ createdAt: -1 }).limit(10).populate('topicId');
    return res.json({
      published: publishedMemory.map((topic) => ({ title: topic.title, sourceUrl: topic.sourceUrl, publishedAt: topic.publishedAt })),
      rejected: rejectedMemory.map((entry) => ({ topic: entry.topicId?.title || 'Unknown', reason: entry.reason, score: entry.score, createdAt: entry.createdAt }))
    });
  } catch (error) {
    console.error('Memory error:', error.message);
    return res.status(500).json({ error: 'Unable to fetch memory records' });
  }
});

router.get('/activity', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const activity = await ActivityLog.find({ agentId }).sort({ createdAt: -1 }).limit(40);
    return res.json({ activity });
  } catch (error) {
    console.error('Activity error:', error.message);
    return res.status(500).json({ error: 'Unable to fetch activity logs' });
  }
});

router.get('/latest-decision', async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const topic = await Topic.findOne({ agentId }).sort({ discoveredAt: -1 });
    if (!topic) return res.status(404).json({ error: 'No decision data available' });
    return res.json({
      topic: topic.title,
      score: topic.editorialScore,
      decision: topic.editorialDecision,
      reason: topic.editorialReason,
      sourceName: topic.sourceName,
      sourceUrl: topic.sourceUrl
    });
  } catch (error) {
    console.error('Latest decision error:', error.message);
    return res.status(500).json({ error: 'Unable to fetch latest decision' });
  }
});

export default router;
