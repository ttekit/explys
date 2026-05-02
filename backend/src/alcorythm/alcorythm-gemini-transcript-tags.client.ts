import { Injectable } from '@nestjs/common';
import {
  normalizeComplexity,
  normalizeSystemTags,
  normalizeUserTags,
  VIDEO_SYSTEM_TAG_LEVELS,
} from 'src/contents/video-content-metadata.constants';

export type TranscriptMetadataInput = {
  transcriptPlainText: string;
  videoTitle?: string | null;
};

export type TranscriptMetadataResult = {
  systemTags: string[];
  userTags: string[];
  complexity: number;
};

/**
 * Gemini: CEFR system tags, free-form user/theme tags, and processing difficulty 1–10.
 */
@Injectable()
export class AlcorythmGeminiTranscriptTagClient {
  async analyzeTranscriptMetadata(
    input: TranscriptMetadataInput,
  ): Promise<TranscriptMetadataResult | null> {
    const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
    const apiUrl =
      process.env.GEMINI_API_URL ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    const transcript = input.transcriptPlainText.slice(0, 14_000);
    const systemList = [...VIDEO_SYSTEM_TAG_LEVELS].join(', ');
    const prompt = [
      'You describe English learning video content from its transcript only.',
      'Return ONLY valid JSON with this exact shape (no extra keys):',
      '{"systemTags":["B1"],"userTags":["Fitness","Nature"],"complexity":5}',
      'Rules:',
      '- systemTags: 1 to 3 items. Each value MUST be copied exactly from this list (spelling, case): ' +
        systemList +
        '. Choose the CEFR level that best matches the language difficulty of what is SPOKEN (vocabulary, grammar, speed).',
      '- userTags: 3 to 10 short human-readable theme/topic labels for learners (e.g. "Fitness", "Office", "History"). In English, Title Case when appropriate. No duplicates.',
      '- complexity: integer 1 to 10 = how hard it is for a typical intermediate learner to *process* the video (density, speed, abstract ideas, accent). 1 = very easy, 10 = very demanding.',
      `Video title: ${input.videoTitle ?? 'unknown'}`,
      'Transcript:',
      transcript,
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

      const parsed = JSON.parse(text) as {
        systemTags?: unknown;
        userTags?: unknown;
        complexity?: unknown;
      };
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const systemTags = normalizeSystemTags(
        Array.isArray(parsed.systemTags)
          ? (parsed.systemTags as string[])
          : [],
      );
      const userTags = normalizeUserTags(
        Array.isArray(parsed.userTags) ? (parsed.userTags as string[]) : [],
      );
      const complexity = normalizeComplexity(parsed.complexity) ?? 5;

      return {
        systemTags,
        userTags,
        complexity,
      };
    } catch {
      return null;
    }
  }
}
