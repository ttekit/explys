import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import Button from "./Button";
import InputText from "./InputText";
import LabelRegister from "./LabelRegister";
import { apiFetch, readApiErrorBody } from "../lib/api";
import { useUser, type UserData } from "../context/UserContext";

export function adultNeedsPreTestProfile(user: UserData): boolean {
  if (user.role !== "adult") {
    return false;
  }
  return (
    !user.workField?.trim() ||
    !user.education?.trim() ||
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
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    const j = job.trim();
    const ed = education.trim();
    const nl = nativeLanguage.trim();
    if (!j) {
      setFieldError("Please enter your job or role.");
      return;
    }
    if (!ed) {
      setFieldError("Please enter your education level or background.");
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
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          A bit about you
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          These details help us calibrate your placement and recommendations.
          They are not part of the test itself.
        </p>
      </div>

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

      <Button type="submit" disabled={saving} className="!mt-2">
        {saving ? "Saving…" : "Continue to entry test"}
      </Button>
    </form>
  );
}
