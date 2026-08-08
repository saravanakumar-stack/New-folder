import Agent from '../models/Agent.js';
import Topic from '../models/Topic.js';
import PublishedPost from '../models/PublishedPost.js';
import ActivityLog from '../models/ActivityLog.js';
import { discoverTopics } from './discoveryService.js';
import { evaluateTopic } from './editorialService.js';
import { checkDuplicateMemory, logRejectedTopic } from './memoryService.js';
import { generatePostContent } from './postGenerator.js';

const cycleLocks = new Map();

const logActivity = async (agentId, eventType, message, metadata = {}) => {
  return ActivityLog.create({ agentId, eventType, message, metadata });
};

export const runAutonomousCycle = async (agentId) => {
  if (cycleLocks.get(agentId)) return;
  cycleLocks.set(agentId, true);

  try {
    const agent = await Agent.findOne({ agentId });
    if (!agent || agent.status !== 'running') {
      return;
    }

    await Agent.updateOne({ agentId }, { isCycleRunning: true, lastCycleAt: new Date() });
    await logActivity(agentId, 'AUTONOMOUS_CYCLE_STARTED', 'Autonomous cycle started.');

    const discoveredTopics = await discoverTopics(agent.personaDomain);
    if (!discoveredTopics.length) {
      await logActivity(agentId, 'TOPICS_DISCOVERED', 'No candidate topics discovered during this cycle.', { count: 0 });
      return;
    }

    const createdTopics = [];
    for (const candidate of discoveredTopics) {
      const topic = await Topic.create({
        ...candidate,
        discoveredAt: new Date(),
        agentId: agent.agentId
      });
      createdTopics.push(topic);
    }

    await logActivity(agentId, 'TOPICS_DISCOVERED', `Discovered ${createdTopics.length} candidate topics.`, { count: createdTopics.length });

    const publishCandidates = [];
    for (const topic of createdTopics) {
      const memoryResult = await checkDuplicateMemory(agentId, topic);
      if (memoryResult.duplicate) {
        await Topic.findByIdAndUpdate(topic._id, {
          editorialDecision: 'reject',
          editorialScore: 0,
          editorialReason: memoryResult.reason
        });
        await logRejectedTopic({ agentId, topicId: topic._id, reason: memoryResult.reason, score: 0 });
        await logActivity(agentId, 'DUPLICATE_DETECTED', memoryResult.reason, { topicId: topic._id });
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

    if (!publishCandidates.length) {
      await logActivity(agentId, 'AUTONOMOUS_CYCLE_COMPLETED', 'No publish candidates after editorial evaluation.');
      return;
    }

    publishCandidates.sort((a, b) => b.evaluation.score - a.evaluation.score);
    const selectedCandidate = publishCandidates[0];
    const finalMemoryCheck = await checkDuplicateMemory(agentId, selectedCandidate.topic);
    if (finalMemoryCheck.duplicate) {
      await Topic.findByIdAndUpdate(selectedCandidate.topic._id, {
        editorialDecision: 'reject',
        editorialReason: finalMemoryCheck.reason
      });
      await logRejectedTopic({ agentId, topicId: selectedCandidate.topic._id, reason: finalMemoryCheck.reason, score: selectedCandidate.evaluation.score });
      await logActivity(agentId, 'DUPLICATE_DETECTED', finalMemoryCheck.reason, { topicId: selectedCandidate.topic._id });
      await logActivity(agentId, 'AUTONOMOUS_CYCLE_COMPLETED', 'Selected topic rejected after final memory check.');
      return;
    }

    await logActivity(agentId, 'TOPIC_SELECTED', `Selected topic for publish: ${selectedCandidate.topic.title}`, { topicId: selectedCandidate.topic._id, score: selectedCandidate.evaluation.score });

    const generatedPost = await generatePostContent(selectedCandidate.topic, {
      name: agent.personaName,
      domain: agent.personaDomain
    });

    const publishedPost = await PublishedPost.create({
      agentId,
      topicId: selectedCandidate.topic._id,
      text: generatedPost.text,
      whySelected: generatedPost.whySelected,
      whyRelevant: generatedPost.whyRelevant,
      sources: [selectedCandidate.topic.sourceUrl],
      editorialScore: selectedCandidate.evaluation.score
    });

    await Topic.findByIdAndUpdate(selectedCandidate.topic._id, {
      editorialDecision: 'publish',
      editorialScore: selectedCandidate.evaluation.score,
      editorialReason: generatedPost.whySelected,
      publishedAt: new Date()
    });

    await logActivity(agentId, 'POST_GENERATED', 'Generated published post content.', { postId: publishedPost._id });
    await logActivity(agentId, 'POST_PUBLISHED', 'Published selected topic to feed.', { postId: publishedPost._id });

    for (let index = 1; index < publishCandidates.length; index += 1) {
      const candidate = publishCandidates[index];
      await Topic.findByIdAndUpdate(candidate.topic._id, {
        editorialDecision: 'reject',
        editorialReason: 'Lower priority candidate after selecting the highest-scoring topic.'
      });
      await logRejectedTopic({ agentId, topicId: candidate.topic._id, reason: 'Lower-priority candidate after selection.', score: candidate.evaluation.score });
      await logActivity(agentId, 'TOPIC_REJECTED', 'Lower-priority topic rejected after selection.', { topicId: candidate.topic._id, score: candidate.evaluation.score });
    }

    await logActivity(agentId, 'AUTONOMOUS_CYCLE_COMPLETED', 'Autonomous cycle completed successfully.');
  } catch (error) {
    console.error('Autonomous cycle failure:', error.message);
    await logActivity(agentId, 'AUTONOMOUS_CYCLE_FAILED', `Cycle failed: ${error.message}`, {
      stack: error.stack
    });
  } finally {
    cycleLocks.set(agentId, false);
    await Agent.updateOne({ agentId }, { isCycleRunning: false, lastCycleAt: new Date() });
  }
};
