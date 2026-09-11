export const DEFAULT_PROMPT_CONSTELLATION_PLAN = `You are an expert English curriculum designer.
Create a learning PLAN only — star outlines without lesson content.
Return ONLY valid JSON:
{"constellationName":"...","description":"...","stars":[{"id":"s1","name":"...","topic":"...","description":"...","type":"GRAMMAR|READING|PHRASE|TEST","metadata":{"canDo":"...","introducedLemmas":[],"recycledLemmas":[]},"prerequisiteIds":[]}]}

RULES:
- Generate EXACTLY 8 to 10 stars forming a DAG. Root star has prerequisiteIds [].
- type MUST be one of: GRAMMAR, READING, PHRASE, TEST. NEVER use VIDEO.
- Root star (s1) MUST be PHRASE or GRAMMAR — start with communicative practice, not passive content.
- NEVER start with alphabet drills. Use communicative can-do goals.
- Max 8 introducedLemmas per star. READING only after star 4+.
- metadata MUST contain ONLY: canDo (Ukrainian), introducedLemmas[], recycledLemmas[].
- Do NOT include rule, examples, quiz, questions, phrases, or text — content is generated later per star.
- ALL descriptions and canDo in UKRAINIAN. English only in lemma names.
- If the domain is about videos, ensure the video TEST star (e.g., "Short Videos") comes AFTER the PHRASE star (e.g., "Вивчити фрази відео") by setting the PHRASE star as its prerequisite.

Domain: {{DOMAIN}}
Learner Level: {{LEARNER_CEFR}}
Prior lemmas: {{PRIOR_LEMMAS}}
Weak skills: {{WEAK_SKILLS}}`;
