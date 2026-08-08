import axios from 'axios';

const domainIndicators = [
  'ai security',
  'prompt injection',
  'adversarial',
  'model security',
  'secure ai',
  'ai privacy',
  'ai vulnerabilities',
  'red teaming',
  'llm security',
  'safe ai',
  'model governance',
  'secure deployment',
  'agent security'
];

const sources = [
  { url: 'https://thehackernews.com/feeds/posts/default', sourceName: 'The Hacker News' },
  { url: 'https://www.darkreading.com/rss.xml', sourceName: 'Dark Reading' },
  { url: 'https://www.schneier.com/feed/atom/', sourceName: 'Bruce Schneier' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', sourceName: 'NYTimes Technology' }
];

const normalizeText = (value) => (value || '').replace(/<[^>]+>/g, '').trim();

const extractMatch = (content, regex) => {
  const match = content.match(regex);
  return match ? normalizeText(match[1]) : null;
};

const isRelevant = (text, personaDomain) => {
  const lower = (text || '').toLowerCase();
  return domainIndicators.some((keyword) => lower.includes(keyword)) || lower.includes(personaDomain.toLowerCase());
};

const parseFeedItem = (item, sourceName) => {
  const title = extractMatch(item, /<title>([\s\S]*?)<\/title>/i);
  const link = extractMatch(item, /<link(?:[^>]*?)>([\s\S]*?)<\/link>/i);
  const summary = extractMatch(item, /<description>([\s\S]*?)<\/description>/i) || extractMatch(item, /<summary>([\s\S]*?)<\/summary>/i) || title;
  const pubDateText = extractMatch(item, /<pubDate>([\s\S]*?)<\/pubDate>/i) || extractMatch(item, /<updated>([\s\S]*?)<\/updated>/i);
  const publishedAt = pubDateText ? new Date(pubDateText) : new Date();

  if (!title || !link) return null;
  return { title, summary, sourceUrl: link, sourceName, publishedAt };
};

export const discoverTopics = async (personaDomain) => {
  const results = [];
  for (const source of sources) {
    try {
      const response = await axios.get(source.url, { timeout: 12000 });
      const body = response.data;
      const items = [...body.matchAll(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi)].map((match) => match[0]);
      for (const item of items) {
        const topic = parseFeedItem(item, source.sourceName);
        if (!topic) continue;
        if (isRelevant(topic.title + ' ' + topic.summary, personaDomain)) {
          results.push(topic);
        }
      }
    } catch (error) {
      console.warn(`Discovery source failed: ${source.url}`, error.message);
    }
  }

  const unique = [];
  const seen = new Set();
  for (const topic of results) {
    const key = `${topic.title}|${topic.sourceUrl}`;
    if (!seen.has(key)) {
      unique.push(topic);
      seen.add(key);
    }
  }

  return unique.slice(0, 12);
};
