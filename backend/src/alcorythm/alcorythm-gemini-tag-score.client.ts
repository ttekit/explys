import { Injectable } from '@nestjs/common';
import { clamp } from './alcorythm-scoring.util';

type GeminiTagBatchInput = {
  tagNames: string[];
  englishLevel?: string | null;
  nativeLanguage?: string | null;
  knownLanguages: string[];
  knownLanguageLevels: Array<{ language: string; level: string }>;
  education?: string | null;
  workField?: string | null;
  job?: string | null;
  hobbies: string[];
  selectedTopicNames: string[];
  deterministicScores: Record<string, number>;
};

@Injectable()
export class AlcorythmGeminiTagScoreClient {
  async scoreTags(input: GeminiTagBatchInput): Promise<Record<string, number> | null> {
    if (!input.tagNames.length) {
      return {};
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
    const apiUrl =
      process.env.GEMINI_API_URL ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    const prompt = [
      'You are scoring user knowledge for language-learning tags.',
      'Return ONLY valid JSON object where keys are tag names and values are numbers from 0 to 1.',
      'Example: {"Greetings":0.4,"Travel":0.8}',
      `Tags: ${input.tagNames.join(', ')}`,
      `English level: ${input.englishLevel ?? 'unknown'}`,
      `Native language: ${input.nativeLanguage ?? 'unknown'}`,
      `Known languages: ${input.knownLanguages.join(', ') || 'none'}`,
      `Known language levels: ${
        input.knownLanguageLevels.length ? JSON.stringify(input.knownLanguageLevels) : 'none'
      }`,
      `Education: ${input.education ?? 'unknown'}`,
      `Work field: ${input.workField ?? 'unknown'}`,
      `Job: ${input.job ?? 'unknown'}`,
      `Hobbies: ${input.hobbies.join(', ') || 'none'}`,
      `Selected topics: ${input.selectedTopicNames.join(', ') || 'none'}`,
      `Deterministic fallback scores: ${JSON.stringify(input.deterministicScores)}`,
    ].join('\n');

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as any;

      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') {
        return null;
      }

      const parsed = JSON.parse(text) as Record<string, number>;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const normalized: Record<string, number> = {};
      for (const tagName of input.tagNames) {
        const raw = parsed[tagName];
        if (typeof raw === 'number') {
          normalized[tagName] = clamp(raw);
        }
      }

      return normalized;
    } catch {
      return null;
    }
  }
}
