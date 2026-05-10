import { FormEvent, useState } from "react";
import CreatableSelect from "react-select/creatable";
import type { MultiValue } from "react-select";
import toast from "react-hot-toast";
import Button from "./Button";
import InputText from "./InputText";
import LabelRegister from "./LabelRegister";
import { apiFetch, readApiErrorBody } from "../lib/api";
import { useUser, type UserData } from "../context/UserContext";

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

/** Adults must fill job, education, hobbies, and native language before the placement iframe. */
export function adultNeedsPlacementPrepFields(user: UserData): boolean {
  if (user.role !== "adult") {
    return false;
  }
  return (
    !user.workField?.trim() ||
    !user.education?.trim() ||
    !(user.hobbies && user.hobbies.length > 0) ||
    !user.nativeLanguage?.trim()
  );
}

export default function PlacementPreTestStep({
  user,
  onSuccess,
}: {
  user: UserData;
  onSuccess: () => void;
}) {
  const { refreshProfile } = useUser();
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
      setFieldError("Please enter your job or role.");
      return;
    }
    if (!ed) {
      setFieldError("Please enter your education level or background.");
      return;
    }
    if (hobbiesPayload.length < 1) {
      setFieldError("Add at least one hobby.");
      return;
    }
    if (!nl) {
      setFieldError("Please enter your native language.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          workField: j,
          education: ed,
          hobbies: hobbiesPayload,
          nativeLanguage: nl,
        }),
      });
      if (!res.ok) {
        toast.error(await readApiErrorBody(res));
        return;
      }
      await refreshProfile();
      onSuccess();
    } catch {
      toast.error("Could not save your details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-2 [&_label]:text-foreground"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <div className="space-y-2">
        <LabelRegister isRequired={true}>Job</LabelRegister>
        <InputText
          name="workField"
          value={job}
          onChange={(e) => setJob(e.target.value)}
          placeholder="e.g. Software engineer, teacher, student"
        />
      </div>

      <div className="space-y-2">
        <LabelRegister isRequired={true}>Education</LabelRegister>
        <InputText
          name="education"
          value={education}
          onChange={(e) => setEducation(e.target.value)}
          placeholder="e.g. Bachelor’s in design, high school, self-taught"
        />
      </div>

      <div className="flex flex-col gap-1">
        <LabelRegister isRequired={true}>Hobbies</LabelRegister>
        <CreatableSelect<HobbyOption, true>
          isMulti
          isClearable
          options={[]}
          value={hobbiesToOptions(hobbies)}
          onChange={(sel) => setHobbies(normalizeHobbySelection(sel))}
          placeholder="Type a hobby, then press Enter"
          formatCreateLabel={(input) => {
            const t = input.trim();
            return t ? `Add "${t}"` : "Add";
          }}
          noOptionsMessage={() =>
            "Start typing a hobby, then press Enter to add it."
          }
          styles={selectDark}
        />
      </div>

      <div className="space-y-2">
        <LabelRegister isRequired={true}>Native language</LabelRegister>
        <InputText
          name="nativeLanguage"
          value={nativeLanguage}
          onChange={(e) => setNativeLanguage(e.target.value)}
          placeholder="e.g. Ukrainian, Spanish, Mandarin"
        />
      </div>

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
        {saving ? "Saving…" : "Continue to entry test"}
      </Button>
    </form>
  );
}
