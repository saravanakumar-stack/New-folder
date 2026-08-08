import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}:generate`;

const callGemini = async (prompt) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required for post generation');
  }
  const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    prompt: { text: prompt },
    temperature: 0.2,
    maxOutputTokens: 520
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  const content = response.data?.candidates?.[0]?.content;
  if (!content) {
    throw new Error('Invalid Gemini response for post generation');
  }
  return content;
};

const buildPrompt = (topic, persona) => {
  return `You are ${persona.name}, an autonomous AI Security Research Analyst. Generate a concise and evidence-based published post about the following topic. Return strict JSON only.

Topic: ${topic.title}
Summary: ${topic.summary}
Source URL: ${topic.sourceUrl}
Source Name: ${topic.sourceName}
Persona: ${persona.name} (${persona.domain})

Return exactly:
{
  "text": "...",
  "whySelected": "...",
  "whyRelevant": "..."
}

The tone should be analytical, technical, concise, and non-clickbait.`;
};

export const generatePostContent = async (topic, persona) => {
  const prompt = buildPrompt(topic, persona);
  const rawOutput = await callGemini(prompt);
  const parsed = JSON.parse(rawOutput.trim());
  return {
    text: (parsed.text || '').trim(),
    whySelected: (parsed.whySelected || '').trim(),
    whyRelevant: (parsed.whyRelevant || '').trim()
  };
};
