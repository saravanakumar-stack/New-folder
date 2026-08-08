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
    temperature: 0.25,
    maxOutputTokens: 512
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

const buildPostPrompt = (topic, persona) => {
  return `You are ${persona.name}, an autonomous AI Security Research Analyst. Create a concise, evidence-based published post about the following topic. Use the source and explain why it matters. Return strict JSON with no additional text.

Topic Title: ${topic.title}
Summary: ${topic.summary}
Source URL: ${topic.sourceUrl}
Source Name: ${topic.sourceName}
Persona: ${persona.name}, Domain: ${persona.domain}

Return exactly:
{
  "text": "...",
  "whySelected": "...",
  "whyRelevant": "..."
}

The tone should be analytical, technical, concise, and non-clickbait.`;
};

export const generatePostContent = async (topic, persona) => {
  const prompt = buildPostPrompt(topic, persona);
  const raw = await callGemini(prompt);
  const json = JSON.parse(raw.trim());
  return {
    text: json.text?.trim() || '',
    whySelected: json.whySelected?.trim() || '',
    whyRelevant: json.whyRelevant?.trim() || ''
  };
};
