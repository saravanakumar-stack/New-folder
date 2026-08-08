import Topic from '../models/Topic.js';
import PublishedPost from '../models/PublishedPost.js';
import RejectedTopic from '../models/RejectedTopic.js';

const normalizeText = (text) => text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();

const isSimilar = (source, target) => {
  const base = normalizeText(source);
  const compare = normalizeText(target);
  if (!base || !compare) return false;
  return base.includes(compare) || compare.includes(base) || compare.split(' ').filter((word) => base.includes(word)).length >= 4;
};

export const checkDuplicateMemory = async (agentId, topic) => {
  const filters = { agentId, sourceUrl: topic.sourceUrl };
  if (topic._id) filters._id = { $ne: topic._id };
  const exactUrl = await Topic.findOne(filters);
  if (exactUrl) {
    return {
      duplicate: true,
      reason: 'Duplicate source URL already exists in publishing memory.'
    };
  }

  const titleFilters = { agentId, title: topic.title };
  if (topic._id) titleFilters._id = { $ne: topic._id };
  const exactTitle = await Topic.findOne(titleFilters);
  if (exactTitle) {
    return {
      duplicate: true,
      reason: 'Duplicate title already exists in publishing memory.'
    };
  }

  const previousTopics = await Topic.find({ agentId, _id: { $ne: topic._id } }).sort({ discoveredAt: -1 }).limit(50);
  for (const previous of previousTopics) {
    if (isSimilar(previous.title, topic.title) || isSimilar(previous.summary, topic.summary)) {
      return {
        duplicate: true,
        reason: 'Similar topic already exists in memory and prevents duplicate publication.'
      };
    }
  }

  return { duplicate: false };
};

export const logRejectedTopic = async ({ agentId, topicId, reason, score }) => {
  return RejectedTopic.create({ agentId, topicId, reason, score });
};

export const getMemorySummary = async (agentId) => {
  const published = await Topic.find({ agentId, editorialDecision: 'publish' }).sort({ publishedAt: -1 }).limit(5);
  const rejected = await RejectedTopic.find({ agentId }).sort({ createdAt: -1 }).limit(7).populate('topicId');
  return { published, rejected };
};
