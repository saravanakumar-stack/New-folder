import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const callGemini = async (prompt) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required for post generation');
  }
  const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 520
    }
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
  try {
    const prompt = buildPrompt(topic, persona);
    const rawOutput = await callGemini(prompt);
    
    // Gemini may wrap JSON in markdown block. Let's sanitize it.
    let jsonContent = rawOutput.trim();
    if (jsonContent.startsWith('```json')) jsonContent = jsonContent.substring(7);
    if (jsonContent.startsWith('```')) jsonContent = jsonContent.substring(3);
    if (jsonContent.endsWith('```')) jsonContent = jsonContent.substring(0, jsonContent.length - 3);
    
    const parsed = JSON.parse(jsonContent.trim());
    return {
      text: (parsed.text || '').trim(),
      whySelected: (parsed.whySelected || '').trim(),
      whyRelevant: (parsed.whyRelevant || '').trim()
    };
  } catch (error) {
    console.warn('Gemini API failed in generatePostContent, using fallback:', error.message);
    return {
      text: `[Fallback Generated] New development regarding ${topic.title}. Technical insights are temporarily unavailable due to API limits.`,
      whySelected: `[Fallback Generated] Automatically selected due to AI API unavailability.`,
      whyRelevant: `[Fallback Generated] Consistent with the configured persona domain.`
    };
  }
};
