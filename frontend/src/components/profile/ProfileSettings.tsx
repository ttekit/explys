import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Bell,
  Palette,
  Plus,
  Save,
  Shield,
  User,
  X,
} from "lucide-react";
import { apiFetch, getResponseErrorMessage } from "../../lib/api";
import type { UserData } from "../../context/UserContext";
import InputText from "../InputText";
import Button from "../Button";
import { ProfileCard } from "./ProfileCard";
import { ToggleSwitch } from "./ToggleSwitch";
import {
  loadProfileUiPrefs,
  saveProfileUiPrefs,
} from "../../lib/profileUiPrefs";

type GenreOption = { id: number; name: string };

export function ProfileSettings({
  user,
  onSaved,
}: {
  user: UserData;
  onSaved: () => Promise<void>;
}) {
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
  const [dangerOpen, setDangerOpen] = useState<"reset" | "delete" | null>(
    null,
  );

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
      videoQuality:
        user.videoQuality?.trim() || prev.videoQuality || "auto",
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
      toast.error("Please enter your name.");
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
      toast.success("Profile saved.");
      await onSaved();
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Could not save profile. Try again.",
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
  ]);

  const saveLearnerPreferences = useCallback(async () => {
    const speed = Number.parseFloat(preferences.playbackSpeed);
    if (!Number.isFinite(speed) || speed <= 0) {
      toast.error("Choose a valid playback speed.");
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

      toast.success("Preferences saved.");
      await onSaved();
    } catch (e) {
      console.error(e);
      toast.error("Could not save preferences. Try again.");
    } finally {
      setSavingPrefs(false);
    }
  }, [notifications, preferences, user.id, onSaved]);

  return (
    <div className="space-y-6">
      <ProfileCard
        title={
          <span className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            Profile information
          </span>
        }
      >
        <p className="mb-6 text-sm text-muted-foreground">
          Update your personal details. Email is tied to your login and
          isn&apos;t editable here.
        </p>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                Full name
              </span>
              <InputText value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Email</span>
              <InputText value={email} disabled className="opacity-70" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                Job / occupation
              </span>
              <InputText
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="e.g. Software engineer"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                Education
              </span>
              <InputText
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. Bachelor's degree"
              />
            </label>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">
              Hobbies &amp; interests
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
                    aria-label={`Remove ${hobby}`}
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
                placeholder="Add a hobby..."
                onKeyDown={(e) => e.key === "Enter" && addHobby()}
                className="flex-1"
              />
              <button
                type="button"
                onClick={addHobby}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-muted"
                aria-label="Add hobby"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <hr className="border-border/60" />

          <div>
            <span className="mb-1 block text-sm font-medium text-foreground">
              Genre preferences
            </span>
            <p className="mb-4 text-sm text-muted-foreground">
              Tap the left side to favorite a genre, or the right to mark one
              to avoid.
            </p>
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
                      aria-label={`Avoid ${g.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-3 rounded bg-accent" /> Prefer
              </span>
              <span className="flex items-center gap-1">
                <span className="size-3 rounded bg-destructive" /> Avoid
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            className="mt-0 inline-flex w-auto items-center gap-2 px-6"
            disabled={saving}
            onClick={() => void saveProfile()}
          >
            <Save className="size-4" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </ProfileCard>

      <ProfileCard
        title={
          <span className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            Notifications
          </span>
        }
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Notification choices are saved on this device. Email and push delivery
          can be wired up later — your toggles stay here until then.
        </p>
        <div className="divide-y divide-border/50">
          {[
            {
              key: "dailyReminder" as const,
              label: "Daily learning reminder",
              description: "Get reminded to practice every day",
            },
            {
              key: "weeklyReport",
              label: "Weekly progress report",
              description: "Receive a summary of your weekly progress",
            },
            {
              key: "achievements",
              label: "Achievement alerts",
              description: "Get notified when you unlock achievements",
            },
            {
              key: "newContent",
              label: "New content alerts",
              description: "Be notified when new videos are added",
            },
            {
              key: "marketing",
              label: "Marketing emails",
              description: "Receive tips, offers, and updates",
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
            Learning preferences
          </span>
        }
      >
        <p className="mb-6 text-sm text-muted-foreground">
          Default playback speed and quality are stored on your account. Auto-play
          and subtitle defaults are kept on this device. Use{" "}
          <span className="font-medium text-foreground">Save preferences</span>{" "}
          below to persist everything.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Playback speed</span>
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
            <span className="text-sm font-medium">Video quality</span>
            <select
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-foreground"
              value={preferences.videoQuality}
              onChange={(e) =>
                setPreferences((p) => ({ ...p, videoQuality: e.target.value }))
              }
            >
              <option value="auto">Auto</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </label>
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Auto-play next video</p>
              <p className="text-sm text-muted-foreground">
                Automatically play the next lesson in a row
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
                Show subtitles by default
              </p>
              <p className="text-sm text-muted-foreground">
                Prefer English subtitles when available
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
            className="mt-0 inline-flex w-auto items-center gap-2 px-6"
            disabled={savingPrefs}
            onClick={() => void saveLearnerPreferences()}
          >
            <Save className="size-4" />
            {savingPrefs ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </ProfileCard>

      <ProfileCard
        title={
          <span className="flex items-center gap-2 text-destructive">
            <Shield className="size-5" />
            Danger zone
          </span>
        }
        className="border-destructive/30"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-lg bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Reset progress</p>
              <p className="text-sm text-muted-foreground">
                Clear learning progress (not available yet)
              </p>
            </div>
            <button
              type="button"
              className="rounded-xl border border-destructive px-4 py-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setDangerOpen("reset")}
            >
              Reset
            </button>
          </div>
          <div className="flex flex-col gap-4 rounded-lg bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Delete account</p>
              <p className="text-sm text-muted-foreground">
                Permanently remove your account (not available yet)
              </p>
            </div>
            <button
              type="button"
              className="rounded-xl bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setDangerOpen("delete")}
            >
              Delete account
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
              {dangerOpen === "reset" ? "Reset progress?" : "Delete account?"}
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">
              {dangerOpen === "reset"
                ? "This action isn’t available in the app yet. Contact support if you need help."
                : "Account deletion isn’t available in the app yet."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-secondary"
                onClick={() => setDangerOpen(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
