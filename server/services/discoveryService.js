import axios from 'axios';

const normalizeText = (value) => (value || '').replace(/<[^>]+>/g, '').trim();

const extractMatch = (content, regex) => {
  const match = content.match(regex);
  return match ? normalizeText(match[1]) : null;
};

const isRelevant = (text, personaDomain) => {
  const lower = (text || '').toLowerCase();
  const domainParts = personaDomain.toLowerCase().split(' ').filter(p => p.length > 2);
  if (lower.includes(personaDomain.toLowerCase())) return true;
  return domainParts.some(part => lower.includes(part));
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

const generateFallbackPool = (domain) => [
  { title: `Emerging Trends in ${domain}`, summary: `Analysis of recent breakthroughs and methodologies in ${domain}.`, sourceUrl: `internal://${encodeURIComponent(domain)}/1`, sourceName: "Fallback Pool" },
  { title: `Security and Governance across ${domain}`, summary: `Evaluating the deployment safeguards and ecosystem risk in ${domain}.`, sourceUrl: `internal://${encodeURIComponent(domain)}/2`, sourceName: "Fallback Pool" },
  { title: `Future Projections for ${domain}`, summary: `What researchers and industry leaders are building next in ${domain}.`, sourceUrl: `internal://${encodeURIComponent(domain)}/3`, sourceName: "Fallback Pool" },
  { title: `Understanding the Impact of ${domain}`, summary: `A deep dive into how ${domain} is reshaping modern architecture and societal norms.`, sourceUrl: `internal://${encodeURIComponent(domain)}/4`, sourceName: "Fallback Pool" }
];

export const discoverTopics = async (personaDomain) => {
  const results = [];
  const sources = [
    { url: `https://news.google.com/rss/search?q=${encodeURIComponent(personaDomain)}`, sourceName: 'Google News Discovery' },
    { url: `https://news.google.com/rss/search?q=${encodeURIComponent(personaDomain + ' innovation')}`, sourceName: 'Google News Discovery' }
  ];

  for (const source of sources) {
    let retries = 2;
    while (retries > 0) {
      try {
        const response = await axios.get(source.url, { timeout: 10000 });
        const body = response.data;
        const items = [...body.matchAll(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi)].map((match) => match[0]);
        for (const item of items) {
          const topic = parseFeedItem(item, source.sourceName);
          if (!topic) continue;
          if (isRelevant(topic.title + ' ' + topic.summary, personaDomain)) {
            results.push(topic);
          }
        }
        break; // Success, exit retry loop
      } catch (error) {
        retries--;
        console.warn(`[DISCOVERY] ${source.url} failed. Retries left: ${retries}. Error: ${error.message}`);
        if (retries === 0) {
          console.warn(`[DISCOVERY] Skipping source ${source.url} due to repeated network failures.`);
        }
      }
    }
  }

  if (results.length === 0) {
    console.warn('[DISCOVERY] All external sources failed or yielded no results. Injecting internal fallback pool.');
    const genericFallback = generateFallbackPool(personaDomain);
    genericFallback.forEach(fb => results.push({ ...fb, publishedAt: new Date() }));
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
