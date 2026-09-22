import { validate_constellation_plan, validate_star_content_metadata } from "./generated-constellation.validator";
import type { GeneratedConstellation } from "./constellation-gemini.client";

describe("generated-constellation.validator", () => {
  it("validates a lightweight plan without lesson content", () => {
    const generated: GeneratedConstellation = {
      constellationName: "Test Plan",
      description: "desc",
      stars: Array.from({ length: 8 }, (_, index) => ({
        id: `s${index + 1}`,
        name: `Star ${index + 1}`,
        topic: "topic",
        description: "desc",
        prerequisiteIds: index === 0 ? [] : [`s${index}`],
        type: "PHRASE",
        metadata: {
          canDo: "Can do",
          introducedLemmas: ["hello"],
          recycledLemmas: [],
        },
      })),
    };
    expect(validate_constellation_plan(generated).valid).toBe(true);
  });

  it("rejects VIDEO star type in plan", () => {
    const generated: GeneratedConstellation = {
      constellationName: "Test Plan",
      description: "desc",
      stars: Array.from({ length: 8 }, (_, index) => ({
        id: `s${index + 1}`,
        name: `Star ${index + 1}`,
        topic: "topic",
        description: "desc",
        prerequisiteIds: index === 0 ? [] : [`s${index}`],
        type: index === 0 ? "VIDEO" : "PHRASE",
        metadata: {
          canDo: "Can do",
          introducedLemmas: ["hello"],
          recycledLemmas: [],
        },
      })),
    };
    const result = validate_constellation_plan(generated);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("VIDEO");
    }
  });

  it("validates star content metadata for grammar", () => {
    const question = {
      id: "q1",
      type: "blind_audio",
      prompt: "Pick",
      options: ["a", "b", "c"],
      correctAnswer: "a",
    };
    const result = validate_star_content_metadata("GRAMMAR", {
      rule: "x".repeat(200),
      examples: Array.from({ length: 5 }, () => ({ en: "a", uk: "b" })),
      questions: Array.from({ length: 10 }, (_, index) => ({
        ...question,
        id: `q${index + 1}`,
      })),
    });
    expect(result.valid).toBe(true);
  });
});
