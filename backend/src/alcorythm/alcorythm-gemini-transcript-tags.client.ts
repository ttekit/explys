import { Injectable } from '@nestjs/common';
import {
  normalizeComplexity,
  normalizeSystemTags,
  normalizeUserTagsToAllowedGenres,
  VIDEO_SYSTEM_TAG_LEVELS,
} from 'src/contents/video-content-metadata.constants';

export type TranscriptMetadataInput = {
  transcriptPlainText: string;
  videoTitle?: string | null;
  /** Must match `genres.name` in the DB; `userTags` output is restricted to these labels. */
  allowedGenreNames?: readonly string[];
};

export type TranscriptMetadataResult = {
  systemTags: string[];
  userTags: string[];
  complexity: number;
};

/**
 * Gemini: CEFR system tags, content genres (allow-listed from DB), and processing difficulty 1–10.
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
    const genres = (input.allowedGenreNames ?? []).map((g) => String(g).trim()).filter(Boolean);
    const genreCatalogJson = JSON.stringify(genres);
    const userTagRules =
      genres.length === 0
        ? [
            '- userTags: MUST be [] (empty array). No free-form labels; the genre catalog is empty.',
          ]
        : [
            '- userTags: 1 to 10 items. Each string MUST be copied exactly from the genre catalog JSON array below (same spelling and punctuation as one of the listed values). Pick genres that best fit the video (film/TV style or overall content). Do not output any label that is not in that catalog. No duplicates.',
            `- Genre catalog (JSON string array, exhaustive allow-list): ${genreCatalogJson}`,
          ];
    const prompt = [
      'You describe English learning video content from its transcript only.',
      'Return ONLY valid JSON with this exact shape (no extra keys):',
      '{"systemTags":["B1"],"userTags":["Action","Comedy"],"complexity":5}',
      'Rules:',
      '- systemTags: 1 to 3 items. Each value MUST be copied exactly from this list (spelling, case): ' +
        systemList +
        '. Choose the CEFR level that best matches the language difficulty of what is SPOKEN (vocabulary, grammar, speed).',
      ...userTagRules,
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
      const userTags = normalizeUserTagsToAllowedGenres(
        Array.isArray(parsed.userTags) ? (parsed.userTags as string[]) : [],
        genres,
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
