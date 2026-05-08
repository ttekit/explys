import { apiFetch, readApiErrorBody } from "./api";
import type { GroupBase } from "react-select";

export const LEARNING_TOPIC_VALUE_PREFIX = "topic:";
export const LEARNING_TAG_VALUE_PREFIX = "tag:";

type TopicRow = {
  id: number;
  name: string;
  category?: { name: string };
};

type TagRow = {
  id: number;
  name: string;
};

export type LearningTopicOption = { value: string; label: string };

function sortByLabel(a: LearningTopicOption, b: LearningTopicOption) {
  return a.label.localeCompare(b.label);
}

export function buildLearningTopicGroups(
  topics: TopicRow[],
  tags: TagRow[],
): GroupBase<LearningTopicOption>[] {
  const topicOptions: LearningTopicOption[] = topics.map((t) => ({
    value: `${LEARNING_TOPIC_VALUE_PREFIX}${t.id}`,
    label: t.category?.name ? `${t.name} · ${t.category.name}` : t.name,
  }));
  const tagOptions: LearningTopicOption[] = tags.map((g) => ({
    value: `${LEARNING_TAG_VALUE_PREFIX}${g.id}`,
    label: g.name,
  }));
  return [
    { label: "Topics", options: [...topicOptions].sort(sortByLabel) },
    { label: "Tags", options: [...tagOptions].sort(sortByLabel) },
  ];
}

export async function fetchLearningTopicGroups(): Promise<
  GroupBase<LearningTopicOption>[]
> {
  const [topicsRes, tagsRes] = await Promise.all([
    apiFetch("/topics"),
    apiFetch("/tags"),
  ]);
  if (!topicsRes.ok) {
    throw new Error(await readApiErrorBody(topicsRes));
  }
  if (!tagsRes.ok) {
    throw new Error(await readApiErrorBody(tagsRes));
  }
  const topics = (await topicsRes.json()) as TopicRow[];
  const tags = (await tagsRes.json()) as TagRow[];
  return buildLearningTopicGroups(topics, tags);
}
