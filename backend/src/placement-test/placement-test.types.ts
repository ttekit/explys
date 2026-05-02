export type PlacementQuestionType = "grammar" | "vocabulary";

export type PlacementQuestion = {
  id: string;
  type: PlacementQuestionType;
  themeId?: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

export type PlacementTestPayload = {
  title: string;
  knowledgeTags: string[];
  cefrHint: string;
  questions: PlacementQuestion[];
};

export type ThemesFile = {
  version: number;
  themes: Array<{
    id: string;
    label: string;
    vocabulary: string[];
    scenarios: string[];
  }>;
  grammarFoci: Array<{ id: string; label: string; examples: string[] }>;
  vocabularyFoci: string[];
  targetQuestionCount?: number;
};
