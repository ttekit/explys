import { Calendar, Edit2, Flame } from "lucide-react";
import { formatMessage } from "../../lib/formatMessage";
import { useLandingLocale } from "../../context/LandingLocaleContext";

export type ProfileHeaderRole = "adult" | "student" | "teacher";

export interface ProfileHeaderModel {
  name: string;
  email: string;
  avatarUrl?: string;
  role: ProfileHeaderRole;
  level: string;
  joinDateLabel: string | null;
  streakDays: number | null;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileHeader({ user }: { user: ProfileHeaderModel }) {
  const { messages } = useLandingLocale();
  const h = messages.profileHeader;
  const initials = initialsFromName(user.name);
  const roleLabel =
    user.role === "teacher" ? h.roleTeacher
    : user.role === "student" ? h.roleStudent
    : h.roleAdult;

  return (
    <div className="relative">
      <div className="absolute inset-0 h-48 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />

      <div className="relative px-4 pb-6 pt-8 sm:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <div className="relative shrink-0">
            <div className="relative size-28 overflow-hidden rounded-full border-4 border-background shadow-xl">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-primary text-3xl font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
            </div>
            <button
              type="button"
              title={h.photoSoonAria}
              className="absolute hover:cursor-pointer -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-foreground shadow-md"
            >
              <Edit2 className="size-4" />
            </button>
          </div>

          <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {user.name || h.learnerFallback}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="rounded-md border-0 bg-primary/20 px-2.5 py-0.5 text-sm font-medium text-primary">
                  {formatMessage(h.levelLine, { level: user.level || "—" })}
                </span>
                <span className="rounded-md border border-accent px-2.5 py-0.5 text-sm text-accent">
                  {roleLabel}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground">{user.email}</p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
              {user.joinDateLabel ? (
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-4 shrink-0" />
                  <span>
                    {formatMessage(h.joinedLine, {
                      date: user.joinDateLabel,
                    })}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                <Flame className="size-4 shrink-0 text-orange-500" />
                <span className="font-medium text-foreground">
                  {user.streakDays
                    ? formatMessage(h.streakLine, {
                        count: String(user.streakDays),
                      })
                    : h.streakStart}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 lg:block">
            <div className="relative">
              <img src="/Icon.svg" className="w-21 h-25 mr-6 animate-float" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
