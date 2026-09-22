import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { Link, useNavigate } from "react-router";
import { useState, useContext, useEffect, useMemo, FormEvent } from "react";
import {
  RegistrationContext,
  type FormData,
} from "../../context/RegistrationContext";
import MultiSelect from "../../components/MultiSelect";
import {
  fetchLearningTopicGroups,
  type LearningTopicOption,
} from "../../lib/learningTopicsApi";
import type { GroupBase, MultiValue } from "react-select";
import { ArrowLeft } from "lucide-react";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { AuthPageSeo } from "../../lib/authPageSeo";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { formatMessage } from "../../lib/formatMessage";
import {
  RegistrationRoleCards,
  type RegistrationRoleChoice,
} from "../../components/RegistrationRoleCards";
import {
  apiFetch,
  readApiErrorBody,
  setStoredAccessToken,
} from "../../lib/api";
import { restoreRegistrationAccessToken } from "../../lib/registrationSession";
import { useUser } from "../../context/UserContext";

interface SelectOption {
  value: string;
  label: string;
}

interface Pupil {
  name: string;
  surname: string;
}

export default function RegistrationDetails() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const [emptyError, setEmptyError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { messages } = useLandingLocale();
  const { refreshProfile } = useUser();
  const regSeo = messages.auth.registration.step1;
  const step2 = messages.auth.registration.step2;
  const grades = messages.auth.registration.grades;
  const errors = messages.auth.registration.errors;

  const [learningTopicGroups, setLearningTopicGroups] = useState<
    GroupBase<LearningTopicOption>[]
  >([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsLoadError, setTopicsLoadError] = useState<string | null>(null);

  useEffect(() => {
    restoreRegistrationAccessToken();
  }, []);

  useEffect(() => {
    if (!restoreRegistrationAccessToken()) {
      return;
    }

    let cancelled = false;
    setTopicsLoading(true);

    fetchLearningTopicGroups()
      .then((groups) => {
        if (!cancelled) {
          setLearningTopicGroups(groups);
          setTopicsLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load learning topics:", err);
          setTopicsLoadError(
            err instanceof Error ? err.message : errors.topicsLoad,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setTopicsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [errors.topicsLoad]);

  const flatLearningOptions = useMemo(
    () => learningTopicGroups.flatMap((g) => g.options),
    [learningTopicGroups],
  );

  const learningOptionByValue = useMemo(() => {
    const m = new Map<string, LearningTopicOption>();
    for (const o of flatLearningOptions) m.set(o.value, o);
    return m;
  }, [flatLearningOptions]);

  const selectedLearningTopics = useMemo(() => {
    const vals = formData.teacherTopics ?? [];
    return vals
      .map((v) => learningOptionByValue.get(v))
      .filter((o): o is LearningTopicOption => o != null);
  }, [formData.teacherTopics, learningOptionByValue]);

  const gradeOptions: SelectOption[] = [
    { value: "1", label: grades.g1 },
    { value: "2", label: grades.g2 },
    { value: "3", label: grades.g3 },
    { value: "4", label: grades.g4 },
    { value: "5", label: grades.g5 },
    { value: "6", label: grades.g6 },
    { value: "7", label: grades.g7 },
    { value: "8", label: grades.g8 },
    { value: "9", label: grades.g9 },
    { value: "10", label: grades.g10 },
    { value: "11", label: grades.g11 },
    { value: "12", label: grades.g12 },
    { value: "university", label: grades.university },
    { value: "tutor", label: grades.tutor },
  ];

  const handleRoleSelect = (role: RegistrationRoleChoice) => {
    updateFormData({ role } as Partial<FormData>);
    setEmptyError(false);
  };

  const handleTeacherTopicsChange = (
    selected: MultiValue<LearningTopicOption>,
  ) => {
    updateFormData({
      teacherTopics: Array.from(selected ?? []).map((o) => o.value),
    } as Partial<FormData>);
  };

  const pupils: Pupil[] = Array.isArray(formData.studentNames)
    ? formData.studentNames
    : [];

  const addPupil = () => {
    updateFormData({
      studentNames: [...pupils, { name: "", surname: "" }],
    } as Partial<FormData>);
  };

  const updatePupil = (index: number, field: keyof Pupil, value: string) => {
    const updated = [...pupils];
    updated[index][field] = value;
    updateFormData({ studentNames: updated } as Partial<FormData>);
  };

  const removePupil = (index: number) => {
    updateFormData({
      studentNames: pupils.filter((_, i) => i !== index),
    } as Partial<FormData>);
  };

  const handleNext = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (formData.role === "choose" || !formData.role) {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);

    if (formData.role === "teacher") {
      if (formData.teacherGrades === "choose" || !formData.teacherGrades) {
        setFormError(errors.teacherGrades);
        return;
      }

      const currentPupils = (formData.studentNames as Pupil[]) || [];
      const nameRegex = /^[A-Za-z\-]+$/;

      for (let i = 0; i < currentPupils.length; i++) {
        const p = currentPupils[i];

        if (!p.name?.trim() || !p.surname?.trim()) {
          setFormError(
            formatMessage(errors.pupilNameRequired, { n: String(i + 1) }),
          );
          setIsSubmitting(false);
          return;
        }

        if (!nameRegex.test(p.name) || !nameRegex.test(p.surname)) {
          setFormError(
            formatMessage(errors.pupilNameLatinOnly, { n: String(i + 1) }),
          );
          setIsSubmitting(false);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const formattedTopics =
        Array.isArray(formData.teacherTopics) &&
          formData.teacherTopics.length > 0
          ? formData.teacherTopics.map((t: string) => {
            return String(t).replace("topic:", "");
          })
          : undefined;

      const accessToken = restoreRegistrationAccessToken();
      if (!accessToken) {
        setFormError(errors.sessionNotFound);
        setIsSubmitting(false);
        return;
      }

      const registrationPayload = {
        role: formData.role.toUpperCase(),
        teacherGrades:
          formData.role === "teacher" ? formData.teacherGrades : undefined,
        teacherTopics:
          formData.role === "teacher" ? formattedTopics : undefined,
        studentNames:
          formData.role === "teacher" ? formData.studentNames : undefined,
      };

      const cleanPayload = Object.fromEntries(
        Object.entries(registrationPayload).filter(([, v]) => v !== undefined),
      );

      const response = await apiFetch("/auth/update-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
        token: accessToken,
      });

      if (response.ok) {
        const result = (await response.json()) as {
          generatedStudents?: unknown[];
          students?: unknown[];
          access_token?: string;
        };
        localStorage.setItem("temp_email", formData.email);

        const userRole = formData.role;
        const students = result.generatedStudents || result.students || [];

        if (typeof result.access_token === "string" && result.access_token) {
          setStoredAccessToken(result.access_token);
        }

        await refreshProfile();

        if (userRole === "teacher") {
          navigate("/register-success", {
            state: { generatedStudents: students },
          });
        } else {
          navigate("/register-preferences");
        }
      } else {
        setFormError(await readApiErrorBody(response));
      }
    } catch (err) {
      console.error("Error during registration:", err);
      setFormError(errors.networkCheckConnection);
    } finally {
      setIsSubmitting(false);
    }
  };
  const selectedGradeOption = useMemo(() => {
    if (!formData.teacherGrades || formData.teacherGrades === "choose")
      return null;
    return (
      gradeOptions.find((opt) => opt.value === formData.teacherGrades) || null
    );
  }, [formData.teacherGrades]);
  return (
    <>
      <AuthPageSeo
        title={regSeo.seoTitle}
        description={regSeo.seoDescription}
        path="/register-details"
      />
      <AuthSplitLayout
        progressStep={2}
        progressTotal={3}
        mainClassName="max-w-2xl"
        rightTitle={step2.rightTitle}
        rightSubtitle={step2.rightSubtitle}
      >
        <Link
          to="/register"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {step2.back}
        </Link>

        <form className="flex flex-col gap-8" onSubmit={handleNext}>
          <section>
            <h1 className="font-display text-2xl font-bold mb-2">
              {step2.title}
            </h1>
            <p className="mb-6 text-muted-foreground">{step2.lead}</p>
            <RegistrationRoleCards
              value={formData.role}
              onChange={handleRoleSelect}
            />
          </section>

          {formData.role === "teacher" && (
            <section className="space-y-4 border-border border-t pt-8">
              <div className="flex items-start gap-3">
                <img
                  src={`${import.meta.env.BASE_URL}TeacherIcon.svg`}
                  className="w-12 h-15"
                  alt="Teacher"
                />
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {step2.teacherTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {step2.teacherLead}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <LabelRegister isRequired={true}>
                  {step2.studentGrades}
                </LabelRegister>
                <MultiSelect<SelectOption, false>
                  inputId="teacher-grades"
                  options={gradeOptions}
                  isMulti={false}
                  value={selectedGradeOption}
                  onChange={(selected) => {
                    updateFormData({
                      teacherGrades: selected
                        ? (selected as SelectOption).value
                        : "choose",
                    } as Partial<FormData>);
                  }}
                  placeholder={grades.choose}
                  isSearchable={false}
                />
              </div>

              <div className="space-y-2">
                <LabelRegister isRequired={false}>
                  {step2.learningTopics}
                </LabelRegister>
                <MultiSelect<
                  LearningTopicOption,
                  true,
                  GroupBase<LearningTopicOption>
                >
                  inputId="teacher-topics"
                  options={learningTopicGroups}
                  isMulti
                  isLoading={topicsLoading}
                  value={selectedLearningTopics}
                  onChange={handleTeacherTopicsChange}
                  placeholder={
                    topicsLoadError
                      ? step2.topicsPlaceholderUnavailable
                      : step2.topicsPlaceholder
                  }
                  noOptionsMessage={() =>
                    topicsLoadError ? topicsLoadError : step2.noOptionsFound
                  }
                />
                {topicsLoadError && (
                  <p className="text-destructive mt-1 text-sm">
                    {topicsLoadError}
                  </p>
                )}
              </div>

              <div className="border-border border-t pt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <LabelRegister isRequired={false}>
                    {step2.pupilsList}
                  </LabelRegister>
                  <button
                    type="button"
                    onClick={addPupil}
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
                  >
                    {step2.addPupil}
                  </button>
                </div>

                <div className="bg-background border-border max-h-60 overflow-y-auto rounded-xl border p-3 shadow-sm">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-border border-b">
                        <th className="pb-2 font-medium">{step2.pupilName}</th>
                        <th className="pb-2 font-medium">
                          {step2.pupilSurname}
                        </th>
                        <th className="w-12 pb-2" aria-hidden />
                      </tr>
                    </thead>
                    <tbody>
                      {pupils.map((pupil, index) => (
                        <tr
                          key={index}
                          className="border-border border-b align-top last:border-0"
                        >
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              value={pupil.name}
                              onChange={(e) =>
                                updatePupil(index, "name", e.target.value)
                              }
                              placeholder={step2.placeholderName}
                              className="bg-background border-border w-full rounded-lg border px-2 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              value={pupil.surname}
                              onChange={(e) =>
                                updatePupil(index, "surname", e.target.value)
                              }
                              placeholder={step2.placeholderSurname}
                              className="bg-background border-border w-full rounded-lg border px-2 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              aria-label={step2.removePupilAria}
                              onClick={() => removePupil(index)}
                              className="text-destructive/70 hover:cursor-pointer hover:text-destructive px-2 pt-2 font-bold transition-colors"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pupils.length === 0 && (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      {step2.noPupils}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {emptyError && <ValidateError>{errors.selectRole}</ValidateError>}
          {formError && <ValidateError>{formError}</ValidateError>}

          <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-start">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {formData.role === "teacher" ? step2.register : step2.next}
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/register")}
              className="w-full sm:w-auto rounded-xl bg-transparent px-6 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
            >
              {step2.previous}
            </Button>
          </div>
        </form>
      </AuthSplitLayout>
    </>
  );
}
