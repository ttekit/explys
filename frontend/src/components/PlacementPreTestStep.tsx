import { FormEvent, useState } from "react";
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
import { cn } from "../lib/utils";

type HobbyOption = { value: string; label: string };

/** Sentinel value for the “skip entry test” path (not persisted as `englishLevel`). */
const ADULT_SKIP_PLACEMENT_TEST = "none" as const;

const ADULT_PLACEMENT_CEFR_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

type AdultPlacementCefrLevel = (typeof ADULT_PLACEMENT_CEFR_LEVELS)[number];

const ADULT_PLACEMENT_CEFR_SET: ReadonlySet<string> = new Set(
  ADULT_PLACEMENT_CEFR_LEVELS,
);

const selectFieldClass =
  "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-base text-foreground shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Returns a CEFR code when the profile already declares a level strong enough to skip the
 * “English level” field on the prep step and proceed to the iframe entry test.
 *
 * Accepts plain codes (`B2`), codes embedded in labels (`Upper intermediate · B2`), and the same
 * coarse wording the backend mirrors when inferring a band from profile (`Intermediate` → B1,
 * `Advanced` → C1, etc.). Empty / `choose` / unrecognized strings → `""`.
 */
function parseAdultProfileCefrTarget(
  level: string | undefined,
): AdultPlacementCefrLevel | "" {
  const trimmed = level?.trim() ?? "";
  if (!trimmed) {
    return "";
  }
  const lowered = trimmed.toLowerCase();
  if (lowered === "choose") {
    return "";
  }
  const embedded = trimmed.match(/\b(A1|A2|B1|B2|C1|C2)\b/i)?.[1]?.toUpperCase();
  if (embedded && ADULT_PLACEMENT_CEFR_SET.has(embedded)) {
    return embedded as AdultPlacementCefrLevel;
  }
  const upper = trimmed.toUpperCase();
  if (ADULT_PLACEMENT_CEFR_SET.has(upper)) {
    return upper as AdultPlacementCefrLevel;
  }
  if (/\bpre[-\s]?a1\b/i.test(trimmed)) {
    return "A1";
  }
  if (/\bbeginner|elementary|starter\b/i.test(lowered)) {
    return "A1";
  }
  if (/\ba2\b/i.test(lowered)) {
    return "A2";
  }
  if (/\bb1\b/i.test(lowered)) {
    return "B1";
  }
  if (/\bintermediate\b/i.test(lowered)) {
    return "B1";
  }
  if (/\bb2\b/i.test(lowered)) {
    return "B2";
  }
  if (/\badvanced\b/i.test(lowered)) {
    return "C1";
  }
  if (/\bc1\b/i.test(lowered)) {
    return "C1";
  }
  if (/\bproficient|mastery\b/i.test(lowered)) {
    return "C2";
  }
  if (/\bc2\b/i.test(lowered)) {
    return "C2";
  }
  return "";
}

type PlacementPreTestSuccessDetail = {
  readonly skippedPlacementTest: boolean;
};

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

/**
 * Adults must fill job, education, native language, hobbies, and either choose a CEFR
 * target (entry test) or complete the skip path (handled via `hasCompletedPlacement`).
 */
export function adultNeedsPlacementPrepFields(user: UserData): boolean {
  if (user.role !== "adult") {
    return false;
  }
  return (
    !user.workField?.trim() ||
    !user.education?.trim() ||
    !(user.hobbies && user.hobbies.length > 0) ||
    !user.nativeLanguage?.trim() ||
    !parseAdultProfileCefrTarget(user.englishLevel)
  );
}

/**
 * Whether the catalog should show the student placement-preferences overlay (step before iframe test).
 * Roster-linked students: hobbies + at least one favourite genre.
 * Independent `student` accounts: same fields plus job, education, and native language (aligned with adult prep).
 */
export function studentNeedsPlacementPreferencesOverlay(
  user: UserData,
): boolean {
  if (user.role !== "student") {
    return false;
  }
  const hasGenres = (user.favoriteGenres?.length ?? 0) > 0;
  const hasHobbies = (user.hobbies?.length ?? 0) > 0;
  if (user.teacherId != null) {
    return !hasHobbies || !hasGenres;
  }
  return (
    !user.workField?.trim() ||
    !user.education?.trim() ||
    !user.nativeLanguage?.trim() ||
    !hasHobbies ||
    !hasGenres
  );
}

export default function PlacementPreTestStep({
  user,
  onSuccess,
}: {
  user: UserData;
  onSuccess: (detail?: PlacementPreTestSuccessDetail) => void;
}) {
  const { refreshProfile } = useUser();
  const { messages } = useLandingLocale();
  const a = messages.placementFlow.adult;
  const [job, setJob] = useState(() => user.workField?.trim() ?? "");
  const [education, setEducation] = useState(
    () => user.education?.trim() ?? "",
  );
  const [nativeLanguage, setNativeLanguage] = useState(
    () => user.nativeLanguage?.trim() ?? "",
  );
  const [hobbies, setHobbies] = useState<string[]>(() => [
    ...(user.hobbies ?? []),
  ]);
  const [englishLevelChoice, setEnglishLevelChoice] = useState(() => {
    const fromProfile = parseAdultProfileCefrTarget(user.englishLevel);
    return fromProfile === "" ? "" : fromProfile;
  });
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    const j = job.trim();
    const ed = education.trim();
    const nl = nativeLanguage.trim();
    const hobbiesPayload = hobbies.map((h) => h.trim()).filter(Boolean);
    if (!j) {
      setFieldError(a.errorJob);
      return;
    }
    if (!ed) {
      setFieldError(a.errorEducation);
      return;
    }
    if (hobbiesPayload.length < 1) {
      setFieldError(a.errorHobbies);
      return;
    }
    if (!nl) {
      setFieldError(a.errorNativeLanguage);
      return;
    }
    const hasCefrTarget = ADULT_PLACEMENT_CEFR_SET.has(englishLevelChoice);
    const isSkip = englishLevelChoice === ADULT_SKIP_PLACEMENT_TEST;
    if (englishLevelChoice === "" || (!hasCefrTarget && !isSkip)) {
      setFieldError(a.errorEnglishLevel);
      return;
    }

    setSaving(true);
    try {
      const skipTest = isSkip;
      const res = await apiFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(
          skipTest
            ? {
                workField: j,
                education: ed,
                hobbies: hobbiesPayload,
                nativeLanguage: nl,
                englishLevel: "A1",
                hasCompletedPlacement: true,
              }
            : {
                workField: j,
                education: ed,
                hobbies: hobbiesPayload,
                nativeLanguage: nl,
                englishLevel: englishLevelChoice,
              },
        ),
      });
      if (!res.ok) {
        toast.error(await readApiErrorBody(res));
        return;
      }
      await refreshProfile();
      onSuccess(skipTest ? { skippedPlacementTest: true } : undefined);
    } catch {
      toast.error(a.saveErrorToast);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pt-2 [&_label]:text-foreground"
      onSubmit={(e) => void handleSubmit(e)}
    >
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
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder={a.jobPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <LabelRegister isRequired={true}>{a.education}</LabelRegister>
            <InputText
              name="education"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder={a.educationPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <LabelRegister isRequired={true}>{a.nativeLanguage}</LabelRegister>
            <InputText
              name="nativeLanguage"
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              placeholder={a.nativeLanguagePlaceholder}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/50 bg-muted/15 p-4">
        <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
          {a.sectionInterests}
        </h3>
        <div className="flex flex-col gap-1">
          <LabelRegister isRequired={true}>{a.hobbies}</LabelRegister>
          <CreatableSelect<HobbyOption, true>
            isMulti
            isClearable
            options={[]}
            value={hobbiesToOptions(hobbies)}
            onChange={(sel) => setHobbies(normalizeHobbySelection(sel))}
            placeholder={a.hobbiesPlaceholder}
            formatCreateLabel={(input) => {
              const t = input.trim();
              return t ? formatMessage(a.addChipNamed, { name: t }) : a.addChip;
            }}
            noOptionsMessage={() => a.hobbyNoOptions}
            styles={selectDark}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/50 bg-muted/15 p-4">
        <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
          {a.sectionEnglish}
        </h3>
        <div className="space-y-2">
          <LabelRegister isRequired={true}>{a.englishLevel}</LabelRegister>
          <select
            name="englishLevel"
            value={englishLevelChoice}
            onChange={(e) => setEnglishLevelChoice(e.target.value)}
            className={cn(selectFieldClass, "appearance-auto")}
            aria-describedby="placement-english-level-help"
          >
            <option value="" disabled>
              {a.englishLevelSelectPlaceholder}
            </option>
            <option value={ADULT_SKIP_PLACEMENT_TEST}>{a.englishLevelNone}</option>
            {ADULT_PLACEMENT_CEFR_LEVELS.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <p
            id="placement-english-level-help"
            className="text-muted-foreground text-sm"
          >
            {a.englishLevelHelp}
          </p>
        </div>
      </section>

      {fieldError ? (
        <p className="text-destructive text-sm" role="alert">
          {fieldError}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={saving}
        className="rounded-[15px] bg-primary px-6 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
      >
        {saving
          ? a.saving
          : englishLevelChoice === ADULT_SKIP_PLACEMENT_TEST
            ? a.continueWithoutTestCta
            : a.continueCta}
      </Button>
    </form>
  );
}
