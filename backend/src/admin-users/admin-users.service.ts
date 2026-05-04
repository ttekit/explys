import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";

/** Safe user row for admin table (no password). */
export type AdminUserRowDto = {
  id: number;
  name: string;
  email: string;
  role: string;
  englishLevel: string | null;
  createdAt: string;
  lastLogin: string | null;
  hasCompletedPlacement: boolean;
  isSuspended: boolean;
  videosWatched: number;
  testsCompleted: number;
};

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllSummary(): Promise<AdminUserRowDto[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        hasCompletedPlacement: true,
        lastLogin: true,
        createdAt: true,
        additionalUserData: {
          select: { englishLevel: true },
        },
        _count: {
          select: {
            watchSessions: true,
            comprehensionTestAttempts: true,
          },
        },
      },
    });

    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      englishLevel: u.additionalUserData?.englishLevel?.trim() ?? null,
      createdAt: u.createdAt.toISOString(),
      lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
      hasCompletedPlacement: u.hasCompletedPlacement,
      isSuspended: u.isSuspended,
      videosWatched: u._count.watchSessions,
      testsCompleted: u._count.comprehensionTestAttempts,
    }));
  }
}
