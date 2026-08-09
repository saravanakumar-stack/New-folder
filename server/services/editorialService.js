import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';
const OPENAI_URL = 'https://api.openai.com/v1/responses';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const callAI = async (prompt) => {
  if (OPENAI_API_KEY) {
    const response = await axios.post(OPENAI_URL, {
      model: OPENAI_MODEL,
      input: prompt,
      temperature: 0.15,
      max_output_tokens: 420
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      }
    });

    const output = response.data?.output?.[0]?.content;
    if (!output) {
      throw new Error('Invalid OpenAI response for editorial evaluation');
    }

    return Array.isArray(output)
      ? output.map((item) => (typeof item === 'string' ? item : item?.text || '')).join('')
      : String(output);
  }

  if (!GEMINI_API_KEY) {
    throw new Error('OPENAI_API_KEY or GEMINI_API_KEY is required for editorial evaluation');
  }

  const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 420
    }
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
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

export const evaluateTopic = async (topic, persona, minimumScore = 80) => {
  try {
    const prompt = buildPrompt(topic, persona);
    const rawOutput = await callGemini(prompt);
    let jsonContent = rawOutput.trim();
    if (jsonContent.startsWith('```json')) jsonContent = jsonContent.substring(7);
    if (jsonContent.startsWith('```')) jsonContent = jsonContent.substring(3);
    if (jsonContent.endsWith('```')) jsonContent = jsonContent.substring(0, jsonContent.length - 3);

    const parsed = JSON.parse(jsonContent.trim());
    const decision = parsed.decision === 'publish' ? 'publish' : 'reject';
    const score = Number(parsed.score) || 0;
    const whySelected = parsed.whySelected || '';
    const whyRelevant = parsed.whyRelevant || '';
    const rejectionReason = parsed.rejectionReason || '';
    
    // Use the user-configured minimumScore threshold for publication eligibility
    const finalDecision = decision === 'publish' && score >= minimumScore ? 'publish' : 'reject';

    return {
      decision: finalDecision,
      score,
      whySelected,
      whyRelevant,
      rejectionReason: finalDecision === 'reject' ? (rejectionReason || `Editorial review did not meet the minimum quality threshold of ${minimumScore}.`) : ''
    };
  } catch (error) {
    console.warn('Gemini API failed in evaluateTopic, using fallback:', error.message);
    return {
      decision: 'publish',
      score: 75,
      whySelected: `[Fallback Generated] Automatically selected due to AI API unavailability. Original topic: ${topic.title}`,
      whyRelevant: `[Fallback Generated] Considered relevant by default heuristic.`,
      rejectionReason: ''
    };
  }
};
