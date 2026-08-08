import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}:generate`;

const callGemini = async (prompt) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required for editorial evaluation');
  }

  const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    prompt: { text: prompt },
    temperature: 0.15,
    maxOutputTokens: 420
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  const content = response.data?.candidates?.[0]?.content;
  if (!content) {
    throw new Error('Invalid Gemini response for editorial evaluation');
  }
  return content;
};

const buildPrompt = (topic, persona) => {
  return `You are ${persona.name}, an autonomous AI Security Research Analyst. Evaluate the following candidate topic using strict valid JSON only.

Topic title: ${topic.title}
Summary: ${topic.summary}
Source: ${topic.sourceUrl}
Source name: ${topic.sourceName}

Assess the topic for:
- Domain relevance
- Recency
- Technical significance
- Source credibility
- Audience value
- Novelty
- Duplicate likelihood

Return exactly this JSON object and nothing else:
{
  "decision": "publish" or "reject",
  "score": number,
  "whySelected": "...",
  "whyRelevant": "...",
  "rejectionReason": "..."
}

Choose publish only if the topic is strong AI security coverage with technical relevance and a credible source.`;
};

export const evaluateTopic = async (topic, persona) => {
  try {
    const prompt = buildPrompt(topic, persona);
    const rawOutput = await callGemini(prompt);
    const parsed = JSON.parse(rawOutput.trim());
    const decision = parsed.decision === 'publish' ? 'publish' : 'reject';
    const score = Number(parsed.score) || 0;
    const whySelected = parsed.whySelected || '';
    const whyRelevant = parsed.whyRelevant || '';
    const rejectionReason = parsed.rejectionReason || '';
    const finalDecision = decision === 'publish' && score >= 70 ? 'publish' : 'reject';

    return {
      decision: finalDecision,
      score,
      whySelected,
      whyRelevant,
      rejectionReason: finalDecision === 'reject' ? (rejectionReason || 'Editorial review did not meet the publish threshold.') : ''
    };
  } catch (error) {
    return {
      decision: 'reject',
      score: 0,
      whySelected: '',
      whyRelevant: '',
      rejectionReason: `Editorial evaluation failed: ${error.message}`
    };
  }
};
