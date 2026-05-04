export type TopicKnowledgeItem = {
  topicId: number;
  /** Mean of listening, vocabulary, and grammar. */
  score: number;
  listeningScore: number;
  vocabularyScore: number;
  grammarScore: number;
  confidence: number;
  coverage: number;
  algorithmVersion: string;
};

export type TagKnowledgeItem = {
  tag: string;
  level: number;
};

export type UserProfileContext = {
  englishLevel?: string | null;
  nativeLanguage?: string | null;
  knownLanguages: string[];
  knownLanguageLevels: Array<{ language: string; level: string }>;
  education?: string | null;
  workField?: string | null;
  job?: string | null;
  hobbies: string[];
  selectedTopicIds: Set<number>;
  selectedTopicNames: string[];
};
