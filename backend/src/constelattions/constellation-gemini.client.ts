import { Injectable, Logger } from "@nestjs/common";
import { DEFAULT_PROMPT_CONSTELLATION_PLAN } from "src/config/ai-prompts/constellation-plan.prompt";
import { DEFAULT_PROMPT_STAR_CONTENT } from "src/config/ai-prompts/star-content.prompt";
import { fetch_gemini_json } from "./constellation-gemini-request.util";

export interface GeneratedStar {
  id: string;
  name: string;
  topic: string;
  description: string;
  prerequisiteIds: string[];
  type?: "VIDEO" | "GRAMMAR" | "READING" | "PHRASE" | "TEST";
  metadata?: Record<string, unknown>;
}

export interface GeneratedConstellation {
  constellationName: string;
  description: string;
  stars: GeneratedStar[];
}

export type GenerateConstellationOptions = {
  readonly priorLemmas?: readonly string[];
  readonly weakSkills?: readonly string[];
};

export type GenerateStarContentInput = {
  readonly starType: string;
  readonly starName: string;
  readonly starTopic: string;
  readonly starDescription: string;
  readonly canDo: string;
  readonly introducedLemmas: readonly string[];
  readonly recycledLemmas: readonly string[];
  readonly priorLemmas: readonly string[];
  readonly learnerCefr: string;
  readonly domain: string;
  readonly videoTranscript?: string;
};

/**
 * Calls Gemini to produce constellation plans and per-star lesson content.
 */
@Injectable()
export class ConstellationGeminiClient {
  private readonly logger = new Logger(ConstellationGeminiClient.name);

  async generateConstellationPlan(
    domain: string,
    learnerCefr: string,
    options: GenerateConstellationOptions = {},
  ): Promise<GeneratedConstellation | null> {
    const template =
      process.env.GEMINI_PROMPT_CONSTELLATION_PLAN ||
      DEFAULT_PROMPT_CONSTELLATION_PLAN;
    const prompt = this.build_plan_prompt(template, domain, learnerCefr, options);
    this.logger.log(`Generating constellation plan for ${domain} (${learnerCefr})`);
    return fetch_gemini_json<GeneratedConstellation>(prompt, "constellation-plan");
  }

  async generateStarContent(
    input: GenerateStarContentInput,
  ): Promise<{ metadata: Record<string, unknown> } | null> {
    const template =
      process.env.GEMINI_PROMPT_STAR_CONTENT || DEFAULT_PROMPT_STAR_CONTENT;
    const prompt = template
      .replace(/\{\{STAR_TYPE\}\}/g, input.starType)
      .replace(/\{\{STAR_NAME\}\}/g, input.starName)
      .replace(/\{\{STAR_TOPIC\}\}/g, input.starTopic)
      .replace(/\{\{STAR_DESCRIPTION\}\}/g, input.starDescription)
      .replace(/\{\{CAN_DO\}\}/g, input.canDo)
      .replace(/\{\{INTRODUCED_LEMMAS\}\}/g, input.introducedLemmas.join(", "))
      .replace(/\{\{RECYCLED_LEMMAS\}\}/g, input.recycledLemmas.join(", "))
      .replace(/\{\{PRIOR_LEMMAS\}\}/g, input.priorLemmas.join(", ") || "(none)")
      .replace(/\{\{LEARNER_CEFR\}\}/g, input.learnerCefr)
      .replace(/\{\{DOMAIN\}\}/g, input.domain)
      .replace(/\{\{VIDEO_TRANSCRIPT\}\}/g, input.videoTranscript || "none");
    this.logger.log(`Generating content for star "${input.starName}" (${input.starType})`);
    return fetch_gemini_json<{ metadata: Record<string, unknown> }>(
      prompt,
      `star-content:${input.starName}`,
    );
  }

  /** @deprecated Use generateConstellationPlan — kept for admin compatibility */
  async generateConstellation(
    domain: string,
    learnerCefr: string,
    options: GenerateConstellationOptions = {},
  ): Promise<GeneratedConstellation | null> {
    return this.generateConstellationPlan(domain, learnerCefr, options);
  }

  private build_plan_prompt(
    template: string,
    domain: string,
    learnerCefr: string,
    options: GenerateConstellationOptions,
  ): string {
    const priorLemmas =
      options.priorLemmas && options.priorLemmas.length > 0
        ? options.priorLemmas.join(", ")
        : "(none)";
    const weakSkills =
      options.weakSkills && options.weakSkills.length > 0
        ? options.weakSkills.join(", ")
        : "(none)";
    return template
      .replace(/\{\{DOMAIN\}\}/g, domain)
      .replace(/\{\{LEARNER_CEFR\}\}/g, learnerCefr)
      .replace(/\{\{PRIOR_LEMMAS\}\}/g, priorLemmas)
      .replace(/\{\{WEAK_SKILLS\}\}/g, weakSkills);
  }
}
