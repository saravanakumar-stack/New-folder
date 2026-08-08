import axios from 'axios';

const domainKeywords = [
  'ai security',
  'prompt injection',
  'model vulnerability',
  'adversarial',
  'red teaming',
  'safe ai',
  'ai safety',
  'privacy',
  'governance',
  'llm security',
  'agent security',
  'secure ai'
];

const publicFeeds = [
  { url: 'https://thehackernews.com/feeds/posts/default', sourceName: 'The Hacker News' },
  { url: 'https://www.darkreading.com/rss.xml', sourceName: 'Dark Reading' },
  { url: 'https://www.schneier.com/feed/atom/', sourceName: 'Bruce Schneier' }
];

const normalizeItem = (item) => {
  const titleMatch = item.match(/<title>(.*?)<\/title>/is);
  const linkMatch = item.match(/<link>(.*?)<\/link>/is);
  const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/is) || item.match(/<updated>(.*?)<\/updated>/is);
  const descMatch = item.match(/<description>(.*?)<\/description>/is) || item.match(/<summary>(.*?)<\/summary>/is);

  if (!titleMatch || !linkMatch) {
    return null;
  }

  const title = titleMatch[1].trim();
  const sourceUrl = linkMatch[1].trim();
  const summary = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : title;
  const publishedAt = pubDateMatch ? new Date(pubDateMatch[1].trim()) : new Date();

  return { title, summary, sourceUrl, sourceName: '', publishedAt };
};

const isRelevant = (text) => {
  const lower = text.toLowerCase();
  return domainKeywords.some((keyword) => lower.includes(keyword));
};

export const discoverTopics = async (personaDomain) => {
  const results = [];

  for (const feed of publicFeeds) {
    try {
      const response = await axios.get(feed.url, { timeout: 10000 });
      const body = response.data;
      const itemMatches = [...body.matchAll(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gmi)];

      for (const match of itemMatches) {
        const item = match[0];
        const normalized = normalizeItem(item);
        if (!normalized) continue;
        normalized.sourceName = feed.sourceName;
        if (isRelevant(normalized.title) || isRelevant(normalized.summary) || isRelevant(personaDomain)) {
          results.push(normalized);
        }
      }
    } catch (error) {
      console.warn(`Discovery source failed: ${feed.url}`, error.message);
    }
  }

  // If feeds are unavailable, provide a fallback topic pool to keep autonomy running.
  if (results.length === 0) {
    const fallback = [
      {
        title: 'New prompt injection research highlights LLM risk vectors',
        summary: 'A recent study catalogs prompt injection attack patterns affecting conversational AI models and secure deployment practices.',
        sourceUrl: 'https://example.com/ai-security/prompt-injection-study',
        sourceName: 'SentinelAI Fallback Feed',
        publishedAt: new Date()
      }
    ];
    return fallback;
  }

  // Normalize unique topics.
  const unique = [];
  const seen = new Set();
  for (const topic of results) {
    const key = `${topic.title}|${topic.sourceUrl}`;
    if (!seen.has(key)) {
      unique.push(topic);
      seen.add(key);
    }
  }

  return unique.slice(0, 12).map((topic) => ({
    ...topic,
    summary: topic.summary.substring(0, 800)
  }));
};
