import Topic from '../models/Topic.js';
import RejectedTopic from '../models/RejectedTopic.js';

const normalize = (text) => (text || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();

const isSimilar = (a, b) => {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;
  const words = normalizedB.split(' ').filter((w) => w.length > 3);
  const matches = words.filter((word) => normalizedA.includes(word));
  return matches.length >= 4;
};

export const checkDuplicateMemory = async (agentId, topic) => {
  const sourceFilter = { agentId, sourceUrl: topic.sourceUrl };
  if (topic._id) sourceFilter._id = { $ne: topic._id };
  const sourceMatch = await Topic.findOne(sourceFilter);
  if (sourceMatch) {
    return { duplicate: true, reason: 'Duplicate source URL already exists in memory.' };
  }

  const titleFilter = { agentId, title: topic.title };
  if (topic._id) titleFilter._id = { $ne: topic._id };
  const titleMatch = await Topic.findOne(titleFilter);
  if (titleMatch) {
    return { duplicate: true, reason: 'Duplicate title already exists in memory.' };
  }

  const recentTopics = await Topic.find({ agentId, _id: { $ne: topic._id } }).sort({ discoveredAt: -1 }).limit(40);
  for (const existing of recentTopics) {
    if (isSimilar(existing.title, topic.title) || isSimilar(existing.summary, topic.summary)) {
      return { duplicate: true, reason: 'Similar topic already exists in memory and prevents duplicate publication.' };
    }
  }

  return { duplicate: false };
};

export const logRejectedTopic = async ({ agentId, topicId, reason, score }) => {
  return RejectedTopic.create({ agentId, topicId, reason, score });
};

export const getMemoryRecords = async (agentId) => {
  const published = await Topic.find({ agentId, editorialDecision: 'publish' }).sort({ publishedAt: -1 }).limit(12);
  const rejected = await RejectedTopic.find({ agentId }).sort({ createdAt: -1 }).limit(12).populate('topicId');
  return { published, rejected };
};
