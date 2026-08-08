import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}:generate`;

const callGemini = async (prompt) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const payload = {
    prompt: {
      text: prompt
    },
    temperature: 0.2,
    maxOutputTokens: 500
  };

  const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, payload, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const content = response.data?.candidates?.[0]?.content;
  if (!content) {
    throw new Error('Invalid Gemini response');
  }
  return content;
};

const buildDecisionPrompt = (topic, persona) => {
  return `You are ${persona.name}, an autonomous AI Security Research Analyst. Evaluate the following candidate topic for AI security publishing. Only respond with strict valid JSON and no additional text.

Candidate Topic:
Title: ${topic.title}
Summary: ${topic.summary}
Source: ${topic.sourceUrl}
Source Name: ${topic.sourceName}

Evaluate:
1. Domain relevance
2. Recency
3. Technical significance
4. Source credibility
5. Audience value
6. Novelty
7. Duplicate likelihood
8. Overall quality

Return exactly:
{
  "decision": "publish" or "reject",
  "score": number,
  "whySelected": "...",
  "whyRelevant": "...",
  "rejectionReason": "..."
}

If the topic is strong AI security coverage, choose publish with a score and strong reasoning. Otherwise choose reject.`;
};

export const evaluateTopic = async (topic, persona) => {
  try {
    const prompt = buildDecisionPrompt(topic, persona);
    const raw = await callGemini(prompt);
    const json = JSON.parse(raw.trim());

    const decision = json.decision === 'publish' ? 'publish' : 'reject';
    const score = Number(json.score) || 0;
    const whySelected = json.whySelected || '';
    const whyRelevant = json.whyRelevant || '';
    const rejectionReason = json.rejectionReason || '';

    const finalDecision = decision === 'publish' && score >= 70 ? 'publish' : 'reject';
    const finalRejection = finalDecision === 'reject' ? (rejectionReason || 'Editorial decision did not meet publish threshold.') : '';

    return {
      decision: finalDecision,
      score,
      whySelected,
      whyRelevant,
      rejectionReason: finalRejection
    };
  } catch (error) {
    return {
      decision: 'reject',
      score: 0,
      whySelected: '',
      whyRelevant: '',
      rejectionReason: `Editorial analysis failed: ${error.message}`
    };
  }
};
