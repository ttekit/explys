import { FormEvent, useEffect, useState, type ChangeEvent } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import type { MultiValue } from "react-select";
import toast from "react-hot-toast";
import Button from "./Button";
import InputText from "./InputText";
import LabelRegister from "./LabelRegister";
import { apiFetch, readApiErrorBody } from "../lib/api";
import { useUser, type UserData } from "../context/UserContext";
import { useLandingLocale } from "../context/LandingLocaleContext";
import { formatMessage } from "../lib/formatMessage";

type GenreOption = { value: number; label: string };
type HobbyOption = { value: string; label: string };

function hobbiesToOptions(h: string[]): HobbyOption[] {
  return h.map((x) => ({ value: x, label: x }));
}

function normalizeHobbySelection(sel: MultiValue<HobbyOption>): string[] {
  const raw = sel.map((o) => o.value.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

const selectDark = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: "oklch(0.22 0.03 285)",
    borderColor: "oklch(0.28 0.04 285)",
    borderRadius: 12,
    minHeight: 42,
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: "oklch(0.18 0.03 285)",
    border: "1px solid oklch(0.28 0.04 285)",
  }),
  option: (
    base: Record<string, unknown>,
    state: { isFocused: boolean; isSelected: boolean },
  ) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "oklch(0.65 0.25 295)"
      : state.isFocused
        ? "color-mix(in oklch, oklch(0.65 0.25 295) 14%, transparent)"
        : "transparent",
    color: "#fafafa",
  }),
  multiValue: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: "#3f3f46",
  }),
  multiValueLabel: (base: Record<string, unknown>) => ({
    ...base,
    color: "#fafafa",
  }),
  input: (base: Record<string, unknown>) => ({ ...base, color: "#fafafa" }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: "#71717a",
  }),
  multiValueRemove: (base: Record<string, unknown>) => ({
    ...base,
    color: "#a1a1aa",
    ":hover": { backgroundColor: "#52525b", color: "#fafafa" },
  }),
  clearIndicator: (base: Record<string, unknown>) => ({
    ...base,
    color: "#a1a1aa",
    ":hover": { color: "#fafafa" },
  }),
  dropdownIndicator: (base: Record<string, unknown>) => ({
    ...base,
    color: "#a1a1aa",
    ":hover": { color: "#fafafa" },
  }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: "#fafafa",
  }),
};

export default function PlacementPreferencesStep({
  user,
  onSuccess,
}: {
  user: UserData;
  onSuccess: (updatedProfile: UserData | null) => void;
}) {
  const { refreshProfile } = useUser();
  const { messages } = useLandingLocale();
  const s = messages.placementFlow.student;
  const a = messages.placementFlow.adult;
  const skipGenrePickers = (user.favoriteGenres?.length ?? 0) > 0;
  const collectIndependentProfile =
    user.role === "student" && user.teacherId == null;
  const [genreOptions, setGenreOptions] = useState<GenreOption[]>([]);
  const [hobbies, setHobbies] = useState<string[]>(() => [
    ...(user.hobbies ?? []),
  ]);
  const [favoriteGenres, setFavoriteGenres] = useState<number[]>(
    user.favoriteGenres ?? [],
  );
  const [hatedGenres, setHatedGenres] = useState<number[]>(
    user.hatedGenres ?? [],
  );
  const [workField, setWorkField] = useState(
    () => user.workField?.trim() ?? "",
  );
  const [education, setEducation] = useState(
    () => user.education?.trim() ?? "",
  );
  const [nativeLanguage, setNativeLanguage] = useState(
    () => user.nativeLanguage?.trim() ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (skipGenrePickers) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiFetch("/genres");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { id: number; name: string }[];
        if (!cancelled) {
          setGenreOptions(data.map((g) => ({ value: g.id, label: g.name })));
        }
      } catch {
        if (!cancelled) toast.error(s.loadGenresError);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [s.loadGenresError, skipGenrePickers]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    const hobbiesPayload = hobbies.map((h) => h.trim()).filter(Boolean);
    if (collectIndependentProfile) {
      const j = workField.trim();
      const ed = education.trim();
      const nl = nativeLanguage.trim();
      if (!j) {
        setFieldError(a.errorJob);
        return;
      }
      if (!ed) {
        setFieldError(a.errorEducation);
        return;
      }
      if (!nl) {
        setFieldError(a.errorNativeLanguage);
        return;
      }
    }
    if (hobbiesPayload.length < 1) {
      setFieldError(s.errorHobbies);
      return;
    }
    if (favoriteGenres.length < 1 && !skipGenrePickers) {
      setFieldError(s.errorGenres);
      return;
    }

    setSaving(true);
    try {
      const profilePatch = collectIndependentProfile
        ? {
            workField: workField.trim(),
            education: education.trim(),
            nativeLanguage: nativeLanguage.trim(),
          }
        : {};
      const res = await apiFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(
          skipGenrePickers ?
            {
              ...profilePatch,
              hobbies: hobbiesPayload,
              favoriteGenres: user.favoriteGenres ?? [],
              hatedGenres: user.hatedGenres ?? [],
            }
          : {
              ...profilePatch,
              hobbies: hobbiesPayload,
              favoriteGenres,
              hatedGenres: hatedGenres.length ? hatedGenres : [],
            },
        ),
      });
      if (!res.ok) {
        toast.error(await readApiErrorBody(res));
        return;
      }
      const nextProfile = await refreshProfile();
      onSuccess(nextProfile);
    } catch {
      toast.error(s.saveErrorToast);
    } finally {
      setSaving(false);
    }
  };

  const onHobbiesChange = (sel: MultiValue<HobbyOption>) => {
    setHobbies(normalizeHobbySelection(sel));
  };

  const favoriteValue = genreOptions.filter((o) =>
    favoriteGenres.includes(o.value),
  );
  const hatedValue = genreOptions.filter((o) => hatedGenres.includes(o.value));

  const optionsForFavorite = genreOptions.filter(
    (o) => !hatedGenres.includes(o.value),
  );
  const optionsForHated = genreOptions.filter(
    (o) => !favoriteGenres.includes(o.value),
  );

  const onFavoriteChange = (sel: MultiValue<GenreOption>) => {
    const next = sel.map((o) => o.value);
    setFavoriteGenres(next);
    setHatedGenres((prev) => prev.filter((id) => !next.includes(id)));
  };
  const onHatedChange = (sel: MultiValue<GenreOption>) => {
    const next = sel.map((o) => o.value);
    setHatedGenres(next);
    setFavoriteGenres((prev) => prev.filter((id) => !next.includes(id)));
  };

  return (
    <form
      className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-2 [&_label]:text-foreground"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {s.title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {skipGenrePickers ? s.leadGenresSaved : s.lead}
        </p>
      </div>

      {collectIndependentProfile ?
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {a.formIntro}
          </p>
          <section className="space-y-4 rounded-xl border border-border/50 bg-muted/15 p-4">
            <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
              {a.sectionAbout}
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <LabelRegister isRequired={true}>{a.job}</LabelRegister>
                <InputText
                  name="workField"
                  value={workField}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setWorkField(e.target.value)}
                  placeholder={a.jobPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <LabelRegister isRequired={true}>{a.education}</LabelRegister>
                <InputText
                  name="education"
                  value={education}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEducation(e.target.value)}
                  placeholder={a.educationPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <LabelRegister isRequired={true}>{a.nativeLanguage}</LabelRegister>
                <InputText
                  name="nativeLanguage"
                  value={nativeLanguage}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNativeLanguage(e.target.value)}
                  placeholder={a.nativeLanguagePlaceholder}
                />
              </div>
            </div>
          </section>
        </>
      : null}

      <div className="flex flex-col gap-1">
        <LabelRegister isRequired={true}>{s.hobbies}</LabelRegister>
        <CreatableSelect<HobbyOption, true>
          isMulti
          isClearable
          options={[]}
          value={hobbiesToOptions(hobbies)}
          onChange={onHobbiesChange}
          placeholder={s.hobbiesPlaceholder}
          formatCreateLabel={(input) => {
            const t = input.trim();
            return t ? formatMessage(s.addChipNamed, { name: t }) : s.addChip;
          }}
          noOptionsMessage={() => s.hobbyNoOptions}
          styles={selectDark}
        />
      </div>

      {!skipGenrePickers ?
        <>
          <div className="flex flex-col gap-1">
            <LabelRegister isRequired={true}>{s.genresPrefer}</LabelRegister>
            <Select<GenreOption, true>
              isMulti
              options={optionsForFavorite}
              value={favoriteValue}
              onChange={onFavoriteChange}
              placeholder={s.genresPreferPlaceholder}
              styles={selectDark}
            />
          </div>

          <div className="flex flex-col gap-1">
            <LabelRegister isRequired={false}>{s.genresAvoid}</LabelRegister>
            <Select<GenreOption, true>
              isMulti
              options={optionsForHated}
              value={hatedValue}
              onChange={onHatedChange}
              placeholder={s.genresAvoidPlaceholder}
              styles={selectDark}
            />
          </div>
        </>
      : null}

      {fieldError ? (
        <p className="text-destructive text-sm" role="alert">
          {fieldError}
        </p>
      ) : null}

      <Button type="submit" disabled={saving} className="!mt-2">
        {saving ? s.saving : s.continueCta}
      </Button>
    </form>
  );
}
