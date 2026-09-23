import { useState } from "react";
import { Calendar, Edit2, Flame } from "lucide-react";
import { formatMessage } from "../../lib/formatMessage";
import { useAppMessages } from "../../hooks/useAppMessages";
import { updateUserAvatar } from "../../lib/api";
import { AvatarPickerModal } from "./AvatarPickerModal";
import { useLandingLocale } from "../../context/LandingLocaleContext";

export type ProfileHeaderRole = "adult" | "student" | "teacher" | "admin";

export interface ProfileHeaderModel {
  name: string;
  email: string;
  avatarUrl?: string;
  role: ProfileHeaderRole;
  level: string;
  joinDateLabel: string | null;
  fullJoinDate?: string | Date;
  streakDays: number | null;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileHeader({ user }: { user: ProfileHeaderModel }) {
  const h = useAppMessages().profileHeader;
  const { locale } = useLandingLocale();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const initials = initialsFromName(user.name);
  const roleLabel =
    user.role === "teacher"
      ? h.roleTeacher || "Teacher"
      : user.role === "student"
        ? h.roleStudent || "Student"
        : user.role === "admin"
          ? h.roleAdmin || "Admin"
          : h.roleAdult || "Learner";

  let displayDate = user.joinDateLabel;

  if (user.fullJoinDate) {
    const dateObj = new Date(user.fullJoinDate);
    displayDate = dateObj.toLocaleDateString(
      locale === "uk" ? "uk-UA" : "en-US",
      { day: "numeric", month: "long", year: "numeric" },
    );
  }
  const handleAvatarSave = async (newUrl: string) => {
    try {
      await updateUserAvatar(newUrl);
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert(h.avatarSaveError);
    }
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-primary/20 via-primary/10 to-accent/20" />

      <div className="relative px-4 pb-6 pt-8 sm:px-6 sm:h-fit">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <div className="relative shrink-0">
            <div className="relative size-28 overflow-hidden rounded-full border-4 border-background/40 shadow-xl">
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
              onClick={() => setIsModalOpen(true)}
              title={h.photoAria || "Change photo"}
              className="absolute hover:cursor-pointer -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-foreground shadow-md transition-transform hover:scale-105"
            >
              <Edit2 className="size-4" />
            </button>
          </div>

          <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap">
              <h1 className="max-w-full break-all text-2xl font-bold text-foreground sm:text-3xl">
                {user.name || h.learnerFallback || "Learner"}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {user.role !== "teacher" && (
                  <span className="rounded-md border-0 bg-primary/20 px-2.5 py-0.5 text-sm font-medium text-primary">
                    {formatMessage(h.levelLine || "Level: {level}", {
                      level: user.level || "—",
                    })}
                  </span>
                )}

                <span className="rounded-md border border-accent px-2.5 py-0.5 text-sm text-accent">
                  {roleLabel}
                </span>
              </div>
            </div>

            <p className="max-w-full break-all text-muted-foreground">
              {user.email}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
              {" "}
              {user.joinDateLabel || user.fullJoinDate ? (
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-4 shrink-0" />
                  <span>
                    {formatMessage(h.joinedLineWeb || "Ви з нами {date}", {
                      date: displayDate || "—",
                    })}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                <Flame className="size-4 shrink-0 text-orange-500" />
                <span className="font-medium text-foreground">
                  {user.streakDays
                    ? formatMessage(h.streakLine || "{count} day streak", {
                        count: String(user.streakDays),
                      })
                    : h.streakStart || "Start your streak!"}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 lg:block">
            <div className="relative">
              <img src={`${import.meta.env.BASE_URL}Icon.svg`} className="w-21 h-25 mr-6 animate-float" />
            </div>
          </div>
        </div>
      </div>

      <AvatarPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentAvatarUrl={user.avatarUrl}
        onSave={handleAvatarSave}
      />
    </div>
  );
}
