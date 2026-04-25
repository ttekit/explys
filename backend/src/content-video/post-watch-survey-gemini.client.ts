import { Injectable } from '@nestjs/common';

export type PostWatchSurveyQuestion = {
  id: string;
  type: 'likert' | 'short_text' | 'mcq';
  prompt: string;
  options?: string[];
};

@Injectable()
export class PostWatchSurveyGeminiClient {
  async generateQuestions(input: {
    videoName: string;
    videoDescription: string | null;
  }): Promise<PostWatchSurveyQuestion[] | null> {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const apiUrl =
      process.env.GEMINI_API_URL ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    const prompt = [
      'You create a short post-video survey for English language learners.',
      'Return ONLY valid JSON: {"questions":[...]} with exactly 4 items.',
      'Each question must be an object: {"id":"q1","type":"likert"|"short_text"|"mcq","prompt":"...","options":[]}',
      'For type "likert" use 5 options: "Strongly disagree","Disagree","Neutral","Agree","Strongly agree".',
      'For "mcq" use 3–4 short English options in "options".',
      'For "short_text" omit options or use empty array [].',
      'Questions should check understanding and reflection; reference the video theme only in general terms.',
      `Video title: ${input.videoName}`,
      `Description: ${input.videoDescription?.trim() || 'N/A'}`,
    ].join('\n');

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') {
        return null;
      }
      const parsed = JSON.parse(text) as { questions?: unknown };
      if (!parsed?.questions || !Array.isArray(parsed.questions)) {
        return null;
      }
      return normalizeQuestions(parsed.questions);
    } catch {
      return null;
    }
  }
}

function normalizeQuestions(raw: unknown[]): PostWatchSurveyQuestion[] {
  const out: PostWatchSurveyQuestion[] = [];
  let i = 0;
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : `q${++i}`;
    const type = o.type === 'likert' || o.type === 'short_text' || o.type === 'mcq' ? o.type : 'short_text';
    const prompt = typeof o.prompt === 'string' ? o.prompt.slice(0, 500) : 'Reflect on the video briefly.';
    let options: string[] | undefined;
    if (Array.isArray(o.options) && o.options.length > 0) {
      options = o.options
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.slice(0, 200));
    }
    out.push({ id, type, prompt, options });
  }
  return out.length > 0 ? out : fallbackQuestions();
}

export function fallbackQuestions(): PostWatchSurveyQuestion[] {
  return [
    {
      id: 'q1',
      type: 'likert',
      prompt: 'The video was easy to follow.',
      options: [
        'Strongly disagree',
        'Disagree',
        'Neutral',
        'Agree',
        'Strongly agree',
      ],
    },
    {
      id: 'q2',
      type: 'likert',
      prompt: 'I learned something useful for my English.',
      options: [
        'Strongly disagree',
        'Disagree',
        'Neutral',
        'Agree',
        'Strongly agree',
      ],
    },
    {
      id: 'q3',
      type: 'mcq',
      prompt: 'How would you rate the pace of the video?',
      options: ['Too slow', 'Just right', 'Too fast', 'Not sure'],
    },
    {
      id: 'q4',
      type: 'short_text',
      prompt: 'What is one new word or phrase you remember from the video?',
    },
  ];
}
