import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Bell,
  LogOut,
  Palette,
  Plus,
  Save,
  Shield,
  User,
  X,
} from "lucide-react";
import { apiFetch, getResponseErrorMessage } from "../../lib/api";
import type { UserData } from "../../context/UserContext";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router";
import InputText from "../InputText";
import Button from "../Button";
import { ProfileCard } from "./ProfileCard";
import { ToggleSwitch } from "./ToggleSwitch";
import {
  loadProfileUiPrefs,
  saveProfileUiPrefs,
} from "../../lib/profileUiPrefs";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { formatMessage } from "../../lib/formatMessage";

type GenreOption = { id: number; name: string };

export function ProfileSettings({
  user,
  onSaved,
}: {
  user: UserData;
  onSaved: () => Promise<void>;
}) {
  const { logout } = useUser();
  const navigate = useNavigate();
  const { messages } = useLandingLocale();
  const s = messages.profileSettings;
  const [name, setName] = useState(user.name);
  const [email] = useState(user.email);
  const [job, setJob] = useState(user.workField);
  const [education, setEducation] = useState(user.education);
  const [hobbies, setHobbies] = useState<string[]>(user.hobbies ?? []);
  const [favoriteGenreIds, setFavoriteGenreIds] = useState<number[]>(
    user.favoriteGenres ?? [],
  );
  const [hatedGenreIds, setHatedGenreIds] = useState<number[]>(
    user.hatedGenres ?? [],
  );
  const [newHobby, setNewHobby] = useState("");
  const [genreOptions, setGenreOptions] = useState<GenreOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [dangerOpen, setDangerOpen] = useState<"reset" | "delete" | null>(null);

  const [notifications, setNotifications] = useState(
    () => loadProfileUiPrefs(user.id).notifications,
  );

  const [preferences, setPreferences] = useState(() => {
    const ui = loadProfileUiPrefs(user.id);
    return {
      autoplayNext: ui.autoplayNext,
      showSubtitles: ui.showSubtitles,
      playbackSpeed:
        user.playbackSpeed != null &&
        Number.isFinite(Number(user.playbackSpeed))
          ? String(user.playbackSpeed)
          : "1",
      videoQuality: user.videoQuality?.trim() || "auto",
    };
  });

  useEffect(() => {
    setName(user.name);
    setJob(user.workField);
    setEducation(user.education);
    setHobbies(user.hobbies ?? []);
    setFavoriteGenreIds(user.favoriteGenres ?? []);
    setHatedGenreIds(user.hatedGenres ?? []);
  }, [user]);

  useEffect(() => {
    const ui = loadProfileUiPrefs(user.id);
    setNotifications(ui.notifications);
    setPreferences((prev) => ({
      autoplayNext: ui.autoplayNext,
      showSubtitles: ui.showSubtitles,
      playbackSpeed:
        user.playbackSpeed != null &&
        Number.isFinite(Number(user.playbackSpeed))
          ? String(user.playbackSpeed)
          : prev.playbackSpeed || "1",
      videoQuality: user.videoQuality?.trim() || prev.videoQuality || "auto",
    }));
  }, [user.id, user.playbackSpeed, user.videoQuality]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch("/genres", { method: "GET" });
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!Array.isArray(data)) return;
        setGenreOptions(
          data
            .map((g) => {
              const r = g as Record<string, unknown>;
              const id = Number(r.id);
              const name = String(r.name ?? "");
              if (!Number.isFinite(id) || !name) return null;
              return { id, name };
            })
            .filter(Boolean) as GenreOption[],
        );
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const addHobby = useCallback(() => {
    const t = newHobby.trim();
    if (t && !hobbies.includes(t)) {
      setHobbies([...hobbies, t]);
      setNewHobby("");
    }
  }, [hobbies, newHobby]);

  const toggleGenrePair = useCallback(
    (genreId: number, mode: "favorite" | "hated") => {
      if (mode === "favorite") {
        setFavoriteGenreIds((prev) => {
          const has = prev.includes(genreId);
          if (has) return prev.filter((x) => x !== genreId);
          return [...prev, genreId];
        });
        setHatedGenreIds((h) => h.filter((x) => x !== genreId));
      } else {
        setHatedGenreIds((prev) => {
          const has = prev.includes(genreId);
          if (has) return prev.filter((x) => x !== genreId);
          return [...prev, genreId];
        });
        setFavoriteGenreIds((f) => f.filter((x) => x !== genreId));
      }
    },
    [],
  );

  const saveProfile = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(s.nameRequiredToast);
      return;
    }
    setSaving(true);
    try {
      const id = Number(user.id);
      const res = await apiFetch(`/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          workField: job.trim(),
          education: education.trim(),
          hobbies,
          favoriteGenres: favoriteGenreIds,
          hatedGenres: hatedGenreIds,
        }),
      });
      if (!res.ok) {
        toast.error(await getResponseErrorMessage(res));
        return;
      }
      toast.success(s.profileSavedToast);
      await onSaved();
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : s.saveProfileError,
      );
    } finally {
      setSaving(false);
    }
  }, [
    name,
    job,
    education,
    hobbies,
    favoriteGenreIds,
    hatedGenreIds,
    user.id,
    onSaved,
    s.nameRequiredToast,
    s.profileSavedToast,
    s.saveProfileError,
  ]);

  const saveLearnerPreferences = useCallback(async () => {
    const speed = Number.parseFloat(preferences.playbackSpeed);
    if (!Number.isFinite(speed) || speed <= 0) {
      toast.error(s.playbackSpeedToast);
      return;
    }

    setSavingPrefs(true);
    try {
      saveProfileUiPrefs(user.id, {
        notifications,
        autoplayNext: preferences.autoplayNext,
        showSubtitles: preferences.showSubtitles,
      });

      const res = await apiFetch(`/users/${Number(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playbackSpeed: speed,
          currentResolution: preferences.videoQuality?.trim() || "auto",
        }),
      });

      if (!res.ok) {
        toast.error(await getResponseErrorMessage(res));
        return;
      }

      toast.success(s.prefsSavedToast);
      await onSaved();
    } catch (e) {
      console.error(e);
      toast.error(s.prefsErrorToast);
    } finally {
      setSavingPrefs(false);
    }
  }, [notifications, preferences, user.id, onSaved, s.playbackSpeedToast, s.prefsSavedToast, s.prefsErrorToast]);

  return (
    <div className="space-y-6">
      <ProfileCard
        title={
          <span className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            {s.cardProfileInfo}
          </span>
        }
      >
        <p className="mb-6 text-sm text-muted-foreground">
          {s.cardProfileInfoLead}
        </p>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                {s.labelFullName}
              </span>
              <InputText
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">{s.labelEmail}</span>
              <InputText value={email} disabled className="opacity-70" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                {s.labelJob}
              </span>
              <InputText
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder={s.placeholderJob}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                {s.labelEducation}
              </span>
              <InputText
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder={s.placeholderEducation}
              />
            </label>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">
              {s.hobbiesHeading}
            </span>
            <div className="mb-2 flex flex-wrap gap-2">
              {hobbies.map((hobby) => (
                <span
                  key={hobby}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/20 px-2 py-1 text-sm text-primary"
                >
                  {hobby}
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-primary/20"
                    onClick={() =>
                      setHobbies((prev) => prev.filter((h) => h !== hobby))
                    }
                    aria-label={formatMessage(s.removeHobbyAria, {
                      name: hobby,
                    })}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <InputText
                value={newHobby}
                onChange={(e) => setNewHobby(e.target.value)}
                placeholder={s.placeholderHobby}
                onKeyDown={(e) => e.key === "Enter" && addHobby()}
                className="flex-1"
              />
              <button
                type="button"
                onClick={addHobby}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-muted"
                aria-label={s.addHobbyAria}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <hr className="border-border/60" />

          <div>
            <span className="mb-1 block text-sm font-medium text-foreground">
              {s.genresHeading}
            </span>
            <p className="mb-4 text-sm text-muted-foreground">{s.genresLead}</p>
            <div className="flex flex-wrap gap-2">
              {genreOptions.map((g) => {
                const loved = favoriteGenreIds.includes(g.id);
                const hated = hatedGenreIds.includes(g.id);
                return (
                  <div key={g.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleGenrePair(g.id, "favorite")}
                      className={`rounded-l-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        loved
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {g.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleGenrePair(g.id, "hated")}
                      className={`rounded-r-lg px-2 py-1.5 transition-colors ${
                        hated
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-secondary/80 text-muted-foreground hover:bg-muted"
                      }`}
                      aria-label={formatMessage(s.avoidGenreAria, {
                        name: g.name,
                      })}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-3 rounded bg-accent" /> {s.genreLegendPrefer}
              </span>
              <span className="flex items-center gap-1">
                <span className="size-3 rounded bg-destructive" /> {s.genreLegendAvoid}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            className="rounded-[15px] w-50 bg-primary px-6 py-3.5 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]6"
            disabled={saving}
            onClick={() => void saveProfile()}
          >
            <Save className="size-4" />
            {saving ? s.saving : s.saveChanges}
          </Button>
        </div>
      </ProfileCard>

      <ProfileCard
        title={
          <span className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            {s.cardNotifications}
          </span>
        }
      >
        <p className="mb-4 text-sm text-muted-foreground">{s.cardNotificationsLead}</p>
        <div className="divide-y divide-border/50">
          {[
            {
              key: "dailyReminder" as const,
              label: s.reminderDaily,
              description: s.reminderDailyDesc,
            },
            {
              key: "weeklyReport" as const,
              label: s.reportWeekly,
              description: s.reportWeeklyDesc,
            },
            {
              key: "achievements" as const,
              label: s.achievements,
              description: s.achievementAlertsDesc,
            },
            {
              key: "newContent" as const,
              label: s.newContentAlerts,
              description: s.newContentAlertsDesc,
            },
            {
              key: "marketing" as const,
              label: s.marketing,
              description: s.marketingDesc,
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <ToggleSwitch
                checked={notifications[item.key]}
                onCheckedChange={(checked) =>
                  setNotifications((n) => ({ ...n, [item.key]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </ProfileCard>

      <ProfileCard
        title={
          <span className="flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            {s.cardLearningPrefs}
          </span>
        }
      >
        <p className="mb-6 text-sm text-muted-foreground">
          {formatMessage(s.cardLearningPrefsLead, {
            savePhrase: s.cardLearningPrefsSavePhrase,
          })}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">{s.labelPlaybackSpeed}</span>
            <select
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-foreground"
              value={preferences.playbackSpeed}
              onChange={(e) =>
                setPreferences((p) => ({ ...p, playbackSpeed: e.target.value }))
              }
            >
              <option value="0.5">0.5×</option>
              <option value="0.75">0.75×</option>
              <option value="1">1×</option>
              <option value="1.25">1.25×</option>
              <option value="1.5">1.5×</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{s.labelVideoQuality}</span>
            <select
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-foreground"
              value={preferences.videoQuality}
              onChange={(e) =>
                setPreferences((p) => ({ ...p, videoQuality: e.target.value }))
              }
            >
              <option value="auto">{s.videoQualityAuto}</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </label>
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                {s.autoplayNextTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {s.autoplayNextDesc}
              </p>
            </div>
            <ToggleSwitch
              checked={preferences.autoplayNext}
              onCheckedChange={(checked) =>
                setPreferences((p) => ({ ...p, autoplayNext: checked }))
              }
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                {s.showSubtitlesTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {s.showSubtitlesDesc}
              </p>
            </div>
            <ToggleSwitch
              checked={preferences.showSubtitles}
              onCheckedChange={(checked) =>
                setPreferences((p) => ({ ...p, showSubtitles: checked }))
              }
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-border/50 pt-6">
          <Button
            type="button"
            className="rounded-[15px] w-50 bg-primary px-6 py-3.5 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]6"
            disabled={savingPrefs}
            onClick={() => void saveLearnerPreferences()}
          >
            <Save className="size-4" />
            {savingPrefs ? s.saving : s.savePreferences}
          </Button>
        </div>
      </ProfileCard>

      <ProfileCard
        title={
          <span className="flex items-center gap-2 text-destructive">
            <Shield className="size-5" />
            {s.cardDangerZone}
          </span>
        }
        className="border-destructive/30"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-lg bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">{s.logoutTitle}</p>
              <p className="text-sm text-muted-foreground">{s.logoutDesc}</p>
            </div>
            <button
              type="button"
              className="text-sm flex font-medium text-destructive py-2.5 px-6 transition-all rounded-[15px] hover:bg-destructive/10 hover:cursor-pointer"
              onClick={() => {
                logout();
                toast.success(s.signOutToast);
                void navigate("/loginForm", { replace: true });
              }}
            >
              <LogOut className="size-4 pt-1 pr-1" />
              {s.logoutCta}
            </button>
          </div>
          <div className="flex flex-col gap-4 rounded-lg bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">{s.resetProgressTitle}</p>
              <p className="text-sm text-muted-foreground">{s.resetProgressDesc}</p>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-destructive py-2.5 px-6 transition-all rounded-[15px] hover:bg-destructive/10 hover:cursor-pointer"
              onClick={() => setDangerOpen("reset")}
            >
              {s.resetProgressCta}
            </button>
          </div>
          <div className="flex flex-col gap-4 rounded-lg bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">{s.deleteAccountTitle}</p>
              <p className="text-sm text-muted-foreground">{s.deleteAccountDesc}</p>
            </div>
            <button
              type="button"
              className="rounded-[15px] w-50 bg-destructive px-6 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]6"
              onClick={() => setDangerOpen("delete")}
            >
              {s.deleteAccountCta}
            </button>
          </div>
        </div>
      </ProfileCard>

      {dangerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setDangerOpen(null)}
        >
          <div
            className="max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold text-foreground">
              {dangerOpen === "reset" ? s.dangerReset : s.dangerDelete}
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">
              {dangerOpen === "reset"
                ? s.modalUnavailableResetLead
                : s.deletionUnavailable}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-secondary"
                onClick={() => setDangerOpen(null)}
              >
                {s.modalClose}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
