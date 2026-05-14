import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Prisma } from "src/generated/prisma/client";
import {
  effectiveLearningGoal,
  effectiveTimeHorizon,
} from "src/content-video/studying-plan.util";
import {
  parseStudyingPlanV2Strict,
  wrapStudyingPlanV2,
  type StoredStudyingPlanPhaseV2,
  type StoredStudyingPlanV2,
} from "./studying-plan-json.util";
import { horizonBudgetFromLabel } from "./studying-plan-horizon.util";
import { coarseLevelTier } from "./studying-plan-level.util";
import {
  buildPlanTasksForPhase,
  richPassConditionsForPhase,
  type StudyingPlanTextLocale,
} from "./studying-plan-pass-conditions.builder";
import { StudyingPlanGeminiClient } from "./studying-plan-gemini.client";
import { syncActiveStudyingPhaseForUser } from "./sync-active-studying-phase";

@Injectable()
export class StudyingPlanRegenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: StudyingPlanGeminiClient,
  ) {}

  async regenerateForUser(
    userId: number,
    locale: StudyingPlanTextLocale = "en",
  ): Promise<StoredStudyingPlanV2> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        additionalUserData: {
          select: {
            learningGoal: true,
            timeToAchieve: true,
            englishLevel: true,
            hobbies: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const extra = user.additionalUserData;
    const learningGoal = effectiveLearningGoal(extra?.learningGoal);
    const timeHorizon = effectiveTimeHorizon(extra?.timeToAchieve);
    const englishLevel = extra?.englishLevel?.trim() || "your current level";
    const hobbies = Array.isArray(extra?.hobbies)
      ? extra.hobbies.map((h) => String(h).trim()).filter((h) => h.length > 0)
      : [];

    const fromGemini = await this.gemini.generate({
      learningGoal,
      timeHorizon,
      englishLevel,
      hobbies,
      locale,
    });

    const rawPlan =
      fromGemini ??
      this.fallbackPlan(learningGoal, timeHorizon, hobbies, englishLevel, locale);
    let plan: StoredStudyingPlanV2;
    try {
      plan = parseStudyingPlanV2Strict(rawPlan);
    } catch {
      throw new BadRequestException("Generated studying plan failed validation");
    }

    const json = plan as unknown as Prisma.InputJsonValue;

    await this.prisma.additionalUserData.upsert({
      where: { userId },
      create: {
        userId,
        learningGoal: extra?.learningGoal ?? null,
        timeToAchieve: extra?.timeToAchieve ?? null,
        englishLevel: extra?.englishLevel ?? null,
        hobbies,
        studyingPlanPhases: json,
      },
      update: {
        studyingPlanPhases: json,
      },
    });

    await syncActiveStudyingPhaseForUser(this.prisma, userId);

    return plan;
  }

  private fallbackPlan(
    goal: string,
    horizon: string,
    hobbiesNote: string[],
    englishLevel: string,
    locale: StudyingPlanTextLocale,
  ): StoredStudyingPlanV2 {
    if (locale === "uk") {
      return this.fallbackPlanUk(goal, horizon, hobbiesNote, englishLevel);
    }
    const hobbyLine =
      hobbiesNote.length > 0 ?
        ` Use interests like ${hobbiesNote.slice(0, 3).join(", ")} when choosing clips.`
      : "";
    const budget = horizonBudgetFromLabel(horizon);
    const tier = coarseLevelTier(englishLevel.trim() || "");

    const phases: StoredStudyingPlanPhaseV2[] = [
      {
        title: "Phase 1 — Build the habit",
        summary:
          "Turn English into a small weekly default: short catalog sessions that always include the comprehension check.",
        actions: [
          "Pick 2–3 fixed slots per week for lessons (even 20 minutes counts).",
          "Start with videos near your level; submit every quiz attempt.",
          "Note new vocabulary from key-word lists and revisit it mid-week.",
        ],
        tasks: buildPlanTasksForPhase({ phaseIndex: 0, budget, tier }),
        passConditions: richPassConditionsForPhase({
          phaseIndex: 0,
          budget,
          tier,
          learningGoal: goal,
        }),
      },
      {
        title: "Phase 2 — Stretch input",
        summary:
          "Widen topics and challenge so listening grows without burning out.",
        actions: [
          "Each month add one genre or theme slightly outside your comfort zone.",
          "Re-watch one short clip with subtitles off, then with subtitles.",
          `Choose clips where people do activities aligned with **${goal}**.${hobbyLine}`,
        ],
        tasks: buildPlanTasksForPhase({ phaseIndex: 1, budget, tier }),
        passConditions: richPassConditionsForPhase({
          phaseIndex: 1,
          budget,
          tier,
          learningGoal: goal,
        }),
      },
      {
        title: "Phase 3 — Apply and check",
        summary:
          "Connect what you hear to short spoken or written output so skills transfer.",
        actions: [
          "After each lesson, say or write 3 sentences summarizing it in English.",
          "Monthly, redo one older quiz to confirm retention.",
          "If scores stay high for two weeks, choose slightly harder catalog items.",
        ],
        tasks: buildPlanTasksForPhase({ phaseIndex: 2, budget, tier }),
        passConditions: richPassConditionsForPhase({
          phaseIndex: 2,
          budget,
          tier,
          learningGoal: goal,
        }),
      },
      {
        title: "Phase 4 — Sustain through the horizon",
        summary: `Maintain gains through ${horizon} with light structure and honest goals.`,
        actions: [
          "Keep a minimum weekly watch time even on busy weeks.",
          "Prefer finishing sequences over random browsing.",
          "Adjust your stated goal if life changes—keep the plan realistic.",
        ],
        tasks: buildPlanTasksForPhase({ phaseIndex: 3, budget, tier }),
        passConditions: richPassConditionsForPhase({
          phaseIndex: 3,
          budget,
          tier,
          learningGoal: goal,
        }),
      },
    ];

    return wrapStudyingPlanV2(phases, [
      `At least **${Math.max(2, Math.round(budget.structuredStudyWeeks / 6))}** catalog sessions with quizzes finished each week (scaled to your **~${budget.structuredStudyWeeks}-week** structured window).`,
      "One vocabulary or transcript review pulled from last week’s lessons.",
      "One stretch video slightly above your easiest comfortable pick.",
    ]);
  }

  /** Offline template matching {@link fallbackPlan} when Gemini is unavailable (Ukrainian copy). */
  private fallbackPlanUk(
    goal: string,
    horizon: string,
    hobbiesNote: string[],
    englishLevel: string,
  ): StoredStudyingPlanV2 {
    const hobbyLine =
      hobbiesNote.length > 0 ?
        ` Додай і відео в дусі інтересів: ${hobbiesNote.slice(0, 3).join(", ")}.`
      : "";
    const budget = horizonBudgetFromLabel(horizon);
    const tier = coarseLevelTier(englishLevel.trim() || "");
    const sessions = Math.max(2, Math.round(budget.structuredStudyWeeks / 6));

    const phases: StoredStudyingPlanPhaseV2[] = [
      {
        title: "Етап 1 — Закріпи звичку",
        summary:
          "Зроби англійську невеликим щотижневим ритуалом: короткі заняття з каталогу й перевірки розуміння.",
        actions: [
          "Обери **2–3** фіксовані слоти на тиждень для уроків (навіть **20** хвилин важливі).",
          "Почни з відео близько до свого рівня; надсилай кожну спробу вікторини.",
          "Записуй нову лексику з підказок і коротко повторюй її між уроками.",
        ],
        tasks: buildPlanTasksForPhase({ phaseIndex: 0, budget, tier }),
        passConditions: richPassConditionsForPhase({
          phaseIndex: 0,
          budget,
          tier,
          learningGoal: goal,
          locale: "uk",
        }),
      },
      {
        title: "Етап 2 — Розшир сприйняття",
        summary:
          "Розширюй теми й складність, щоб навчання залишалось досяжним.",
        actions: [
          "Щомісяця додавай один жанр або тему поза «зручним» асортиментом.",
          "Переглянь короткий фрагмент без субтитрів, потім з субтитрами — порівняй, що впустив(ла).",
          `Шукай контент узгоджено з метою **${goal}**.${hobbyLine}`,
        ],
        tasks: buildPlanTasksForPhase({ phaseIndex: 1, budget, tier }),
        passConditions: richPassConditionsForPhase({
          phaseIndex: 1,
          budget,
          tier,
          learningGoal: goal,
          locale: "uk",
        }),
      },
      {
        title: "Етап 3 — Застосуй і перевір",
        summary:
          "Зв’яжи те, що чуєш, із коротким усним або письмовим висновком.",
        actions: [
          "Після уроку скажи або напиши **3** англійські речення-узагальнення.",
          "Раз на місяць повтори стару вікторину або урок для контролю пам’яті.",
          "Якщо вікторини здаються легкими два тижні поспіль — підніми складність клипів.",
        ],
        tasks: buildPlanTasksForPhase({ phaseIndex: 2, budget, tier }),
        passConditions: richPassConditionsForPhase({
          phaseIndex: 2,
          budget,
          tier,
          learningGoal: goal,
          locale: "uk",
        }),
      },
      {
        title: "Етап 4 — Тримай темп до горизонту",
        summary: `Зберігай здобутки протягом **${horizon}** з легкою структурою й чесними очікуваннями.`,
        actions: [
          "Тримай мінімальний щотижневий час перегляду навіть у завантажені періоди.",
          "Надавай перевагу завершеним серіям, а не випадковому гортанню.",
          "Коригуй мету в профілі, якщо контекст змінився — план має лишатися реалістичним.",
        ],
        tasks: buildPlanTasksForPhase({ phaseIndex: 3, budget, tier }),
        passConditions: richPassConditionsForPhase({
          phaseIndex: 3,
          budget,
          tier,
          learningGoal: goal,
          locale: "uk",
        }),
      },
    ];

    return wrapStudyingPlanV2(phases, [
      `Щонайменше **${sessions}** занять у каталозі з вікторинами щотижня (структуроване вікно **~${budget.structuredStudyWeeks}** тиж.).`,
      "Одне повторення лексики або транскрипту з минулотижневих уроків.",
      "Одне «навантажувальне» відео трішки вище найзручнішого рівня.",
    ]);
  }
}
