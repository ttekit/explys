import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { Link, useNavigate } from "react-router";
import SelectRegister from "../../components/SelectRegister";
import {
  useState,
  useContext,
  useEffect,
  useMemo,
  ChangeEvent,
  FormEvent,
} from "react";
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
import {
  getRegisterCredentialsError,
  registerUser,
} from "../../lib/registerUser";
import { ArrowLeft } from "lucide-react";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import {
  RegistrationRoleCards,
  type RegistrationRoleChoice,
} from "../../components/RegistrationRoleCards";
import { useLandingLocale } from "../../context/LandingLocaleContext";

interface SelectOption {
  value: string;
  text: string;
}

interface Pupil {
  name: string;
  surname: string;
}

export default function RegistrationDetails() {
  const { messages, locale } = useLandingLocale();
  const t = messages.auth.registration.step2;
  const err = messages.auth.registration.errors;
  const grades = messages.auth.registration.grades;
  const rolesCopy = messages.auth.registration.roles;
  const netReg = messages.auth.registration.networkRegister;

  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const [emptyError, setEmptyError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const [learningTopicGroups, setLearningTopicGroups] = useState<
    GroupBase<LearningTopicOption>[]
  >([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsLoadError, setTopicsLoadError] = useState<string | null>(null);

  const credentialMsgs = useMemo(
    () => ({
      credentialEmail: err.credentialEmail,
      credentialPassword: err.credentialPassword,
      passwordsDontMatch: err.passwordsNoMatch || "",
    }),
    [err.credentialEmail, err.credentialPassword],
  );

  useEffect(() => {
    let cancelled = false;
    fetchLearningTopicGroups()
      .then((groups) => {
        if (!cancelled) setLearningTopicGroups(groups);
      })
      .catch((loadErr) => {
        if (!cancelled) {
          setTopicsLoadError(
            loadErr instanceof Error ? loadErr.message : err.topicsLoad,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setTopicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [err.topicsLoad]);

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

  const gradeOptions: SelectOption[] = useMemo(
    () => [
      { value: "choose", text: grades.choose },
      { value: "1", text: grades.g1 },
      { value: "2", text: grades.g2 },
      { value: "3", text: grades.g3 },
      { value: "4", text: grades.g4 },
      { value: "5", text: grades.g5 },
      { value: "6", text: grades.g6 },
      { value: "7", text: grades.g7 },
      { value: "8", text: grades.g8 },
      { value: "9", text: grades.g9 },
      { value: "10", text: grades.g10 },
      { value: "11", text: grades.g11 },
      { value: "12", text: grades.g12 },
      { value: "university", text: grades.university },
      { value: "tutor", text: grades.tutor },
    ],
    [grades],
  );

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value } as Partial<FormData>);
  };

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
    if (formData.role === "choose") {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);

    const credsErr = getRegisterCredentialsError(formData, credentialMsgs);
    if (credsErr) {
      setFormError(credsErr);
      return;
    }

    if (formData.role === "teacher") {
      if (formData.teacherGrades === "choose" || !formData.teacherGrades) {
        setFormError(err.teacherGrades);
        return;
      }
      setIsSubmitting(true);
      const result = await registerUser(formData, credentialMsgs, netReg);
      setIsSubmitting(false);
      if (result.success) {
        const students = result.generatedStudents;
        if (students?.length) {
          navigate("/registrationSuccess", {
            state: { generatedStudents: students },
          });
        } else {
          navigate("/loginForm");
        }
      } else {
        setFormError(result.message);
      }
      return;
    }

    navigate("/registrationPreferences");
  };

  return (
    <div lang={locale === "uk" ? "uk" : "en"}>
      <AuthSplitLayout
        progressStep={2}
        progressTotal={3}
        mainClassName="max-w-2xl"
        rightTitle={t.rightTitle}
        rightSubtitle={t.rightSubtitle}
      >
        <Link
          to="/registrationMain"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t.back}
        </Link>

        <form className="flex flex-col gap-8" onSubmit={handleNext}>
          <section>
            <h1 className="font-display text-2xl font-bold mb-2">{t.title}</h1>
            <p className="mb-6 text-muted-foreground">{t.lead}</p>
            <RegistrationRoleCards
              value={formData.role}
              onChange={handleRoleSelect}
              rolesCopy={rolesCopy}
            />
          </section>

          {formData.role === "teacher" && (
            <section className="space-y-4 border-border border-t pt-8">
              <div className="flex items-start gap-3">
                <img src="/Icon.svg" className="w-12 h-15" alt="" />
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {t.teacherTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t.teacherLead}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <LabelRegister isRequired={true}>{t.studentGrades}</LabelRegister>
                <SelectRegister
                  name="teacherGrades"
                  value={formData.teacherGrades}
                  onChange={handleChange}
                  options={gradeOptions}
                />
              </div>

              <div className="space-y-2">
                <LabelRegister isRequired={false}>{t.learningTopics}</LabelRegister>
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
                      ? t.topicsPlaceholderUnavailable
                      : t.topicsPlaceholder
                  }
                  noOptionsMessage={() =>
                    topicsLoadError ? topicsLoadError : t.noOptionsFound
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
                  <LabelRegister isRequired={false}>{t.pupilsList}</LabelRegister>
                  <button
                    type="button"
                    onClick={addPupil}
                    className="rounded-[15px] bg-primary px-6 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
                  >
                    {t.addPupil}
                  </button>
                </div>

                <div className="bg-input border-border max-h-60 overflow-y-auto rounded-xl border p-3">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-border border-b">
                        <th className="pb-2 font-medium">{t.pupilName}</th>
                        <th className="pb-2 font-medium">{t.pupilSurname}</th>
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
                              placeholder={t.placeholderName}
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
                              placeholder={t.placeholderSurname}
                              className="bg-background border-border w-full rounded-lg border px-2 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              aria-label={`${t.removePupilAria} ${index + 1}`}
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
                      {t.noPupils}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {emptyError && (
            <ValidateError>{err.selectRole}</ValidateError>
          )}
          {formError && <ValidateError>{formError}</ValidateError>}

          <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-stretch">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
            >
              {formData.role === "teacher" ? t.register : t.next}
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/registrationMain")}
              className="text-sm font-medium bg-transparent text-foreground/70 hover:text-white py-2.5 px-6 transition-all rounded-[15px] hover:bg-muted-foreground/10 hover:cursor-pointer"
            >
              {t.previous}
            </Button>
          </div>
        </form>
      </AuthSplitLayout>
    </div>
  );
}
