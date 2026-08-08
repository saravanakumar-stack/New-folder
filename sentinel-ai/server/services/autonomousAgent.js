import Agent from '../models/Agent.js';
import Topic from '../models/Topic.js';
import PublishedPost from '../models/PublishedPost.js';
import RejectedTopic from '../models/RejectedTopic.js';
import ActivityLog from '../models/ActivityLog.js';
import { discoverTopics } from './discoveryService.js';
import { evaluateTopic } from './editorialService.js';
import { checkDuplicateMemory, logRejectedTopic } from './memoryService.js';
import { generatePostContent } from './postGenerator.js';

const agentCycleLocks = new Map();

const logActivity = async (agentId, eventType, message, metadata = {}) => {
  await ActivityLog.create({ agentId, eventType, message, metadata });
};

export const runAutonomousCycle = async (agentId) => {
  if (agentCycleLocks.get(agentId)) {
    return;
  }

  agentCycleLocks.set(agentId, true);
  try {
    const agent = await Agent.findOne({ agentId });
    if (!agent || agent.status !== 'running') {
      return;
    }

    await Agent.updateOne({ agentId }, { isCycleRunning: true, lastCycleAt: new Date() });
    await logActivity(agentId, 'AUTONOMOUS_CYCLE_STARTED', 'Autonomous cycle started.');

    const discovered = await discoverTopics(agent.personaDomain || 'AI Security');
    const topicDocs = [];
    for (const candidate of discovered) {
      const topic = await Topic.create({
        ...candidate,
        discoveredAt: new Date(),
        agentId,
        editorialDecision: undefined,
        editorialReason: undefined,
        editorialScore: undefined
      });
      topicDocs.push(topic);
    }

    await logActivity(agentId, 'TOPICS_DISCOVERED', `Discovered ${topicDocs.length} candidate topics.`, { count: topicDocs.length });

    const publishCandidates = [];
    for (const topic of topicDocs) {
      const memoryCheck = await checkDuplicateMemory(agentId, topic);
      if (memoryCheck.duplicate) {
        await Topic.findByIdAndUpdate(topic._id, {
          editorialDecision: 'reject',
          editorialReason: memoryCheck.reason,
          editorialScore: 0
        });
        await logRejectedTopic({ agentId, topicId: topic._id, reason: memoryCheck.reason, score: 0 });
        await logActivity(agentId, 'DUPLICATE_DETECTED', memoryCheck.reason, { topicId: topic._id });
        continue;
      }

      const evaluation = await evaluateTopic(topic, {
        name: agent.personaName,
        domain: agent.personaDomain
      });

      await Topic.findByIdAndUpdate(topic._id, {
        editorialScore: evaluation.score,
        editorialDecision: evaluation.decision,
        editorialReason: evaluation.decision === 'publish' ? evaluation.whySelected : evaluation.rejectionReason
      });

      if (evaluation.decision === 'publish') {
        publishCandidates.push({ topic, evaluation });
      } else {
        await logRejectedTopic({ agentId, topicId: topic._id, reason: evaluation.rejectionReason, score: evaluation.score });
        await logActivity(agentId, 'TOPIC_REJECTED', evaluation.rejectionReason, { topicId: topic._id, score: evaluation.score });
      }
    }

    if (publishCandidates.length === 0) {
      await logActivity(agentId, 'AUTONOMOUS_CYCLE_COMPLETED', 'No eligible publish candidates were found in this cycle.');
      return;
    }

    publishCandidates.sort((a, b) => b.evaluation.score - a.evaluation.score);
    const selected = publishCandidates[0];

    const doubleCheck = await checkDuplicateMemory(agentId, selected.topic);
    if (doubleCheck.duplicate) {
      await Topic.findByIdAndUpdate(selected.topic._id, { editorialDecision: 'reject', editorialReason: doubleCheck.reason, editorialScore: selected.evaluation.score });
      await logRejectedTopic({ agentId, topicId: selected.topic._id, reason: doubleCheck.reason, score: selected.evaluation.score });
      await logActivity(agentId, 'DUPLICATE_DETECTED', `Duplicate detected during final selection: ${doubleCheck.reason}`, { topicId: selected.topic._id });
      await logActivity(agentId, 'AUTONOMOUS_CYCLE_COMPLETED', 'Final publish selection was rejected due to duplicate memory.');
      return;
    }

    await logActivity(agentId, 'TOPIC_SELECTED', `Selected topic for publishing: ${selected.topic.title}`, {
      topicId: selected.topic._id,
      score: selected.evaluation.score
    });

    const generated = await generatePostContent(selected.topic, {
      name: agent.personaName,
      domain: agent.personaDomain
    });

    const published = await PublishedPost.create({
      agentId,
      topicId: selected.topic._id,
      text: generated.text,
      whySelected: generated.whySelected,
      whyRelevant: generated.whyRelevant,
      sources: [selected.topic.sourceUrl],
      editorialScore: selected.evaluation.score
    });

    await Topic.findByIdAndUpdate(selected.topic._id, {
      editorialDecision: 'publish',
      editorialReason: generated.whySelected,
      editorialScore: selected.evaluation.score,
      publishedAt: new Date()
    });

    await logActivity(agentId, 'POST_GENERATED', 'Generated published post content.', { postId: published._id });
    await logActivity(agentId, 'POST_PUBLISHED', 'Posted selected topic to autonomous feed.', { postId: published._id });

    for (let i = 1; i < publishCandidates.length; i += 1) {
      const extra = publishCandidates[i];
      await Topic.findByIdAndUpdate(extra.topic._id, {
        editorialDecision: 'reject',
        editorialReason: 'Lower priority than the selected post this cycle.'
      });
      await logRejectedTopic({ agentId, topicId: extra.topic._id, reason: 'Lower priority than the selected post this cycle.', score: extra.evaluation.score });
      await logActivity(agentId, 'TOPIC_REJECTED', 'Lower priority than selected topic.', { topicId: extra.topic._id, score: extra.evaluation.score });
    }

    await logActivity(agentId, 'AUTONOMOUS_CYCLE_COMPLETED', 'Autonomous cycle completed successfully.');
  } catch (error) {
    console.error('Autonomous cycle failed', error);
    await logActivity(agentId, 'AUTONOMOUS_CYCLE_FAILED', `Cycle failed: ${error.message}`);
  } finally {
    agentCycleLocks.set(agentId, false);
    await Agent.updateOne({ agentId }, { isCycleRunning: false, lastCycleAt: new Date() });
  }
};
