import { PrismaService } from "src/prisma.service";
import { activeStudyingPhaseFromPassedLessons, phaseCountFromStoredPhases } from "../content-video/studying-plan-phase-progress.util";

/**
 * Recompute `activeStudyingPhaseIndex` from distinct passed comprehension videos.
 */
export async function syncActiveStudyingPhaseForUser(
  prisma: PrismaService,
  userId: number,
): Promise<void> {
  const passedRows = await prisma.comprehensionTestAttempt.findMany({
    where: { userId, passed: true },
    distinct: ["contentVideoId"],
    select: { contentVideoId: true },
  });
  const extra = await prisma.additionalUserData.findUnique({
    where: { userId },
    select: { studyingPlanPhases: true },
  });
  const phaseCount = phaseCountFromStoredPhases(extra?.studyingPlanPhases, 4);
  const idx = activeStudyingPhaseFromPassedLessons(
    passedRows.length,
    phaseCount,
  );
  await prisma.additionalUserData.updateMany({
    where: { userId },
    data: { activeStudyingPhaseIndex: idx },
  });
}
