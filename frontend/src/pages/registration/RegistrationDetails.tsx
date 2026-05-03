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
import { ChameleonMascot } from "../../components/ChameleonMascot";
import {
  RegistrationRoleCards,
  type RegistrationRoleChoice,
} from "../../components/RegistrationRoleCards";

interface SelectOption {
  value: string;
  text: string;
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

  const [learningTopicGroups, setLearningTopicGroups] = useState<
    GroupBase<LearningTopicOption>[]
  >([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsLoadError, setTopicsLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLearningTopicGroups()
      .then((groups) => {
        if (!cancelled) setLearningTopicGroups(groups);
      })
      .catch((err) => {
        if (!cancelled) {
          setTopicsLoadError(
            err instanceof Error ? err.message : "Could not load topics",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setTopicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    { value: "choose", text: "Choose grade" },
    { value: "1", text: "1st Grade" },
    { value: "2", text: "2nd Grade" },
    { value: "3", text: "3rd Grade" },
    { value: "4", text: "4th Grade" },
    { value: "5", text: "5th Grade" },
    { value: "6", text: "6th Grade" },
    { value: "7", text: "7th Grade" },
    { value: "8", text: "8th Grade" },
    { value: "9", text: "9th Grade" },
    { value: "10", text: "10th Grade" },
    { value: "11", text: "11th Grade" },
    { value: "12", text: "12th Grade" },
    { value: "university", text: "University" },
    { value: "tutor", text: "Tutor" },
  ];

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

    const credsErr = getRegisterCredentialsError(formData);
    if (credsErr) {
      setFormError(credsErr);
      return;
    }

    if (formData.role === "teacher") {
      if (formData.teacherGrades === "choose" || !formData.teacherGrades) {
        setFormError("Please select the student grades you teach.");
        return;
      }
      setIsSubmitting(true);
      const result = await registerUser(formData);
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
    <AuthSplitLayout
      progressStep={2}
      progressTotal={3}
      mainClassName="max-w-2xl"
      rightTitle="Who are you?"
      rightSubtitle="Tell us your role so we can customize your experience."
      rightMascotMood="thinking"
    >
      <Link
        to="/registrationMain"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <form className="flex flex-col gap-8" onSubmit={handleNext}>
        <section>
          <h1 className="font-display text-2xl font-bold mb-2">
            How will you use CineLingo?
          </h1>
          <p className="mb-6 text-muted-foreground">
            Pick the option that fits you best—we&apos;ll tailor the setup.
          </p>
          <RegistrationRoleCards value={formData.role} onChange={handleRoleSelect} />
        </section>

        {formData.role === "teacher" && (
          <section className="space-y-4 border-border border-t pt-8">
            <div className="flex items-start gap-3">
              <ChameleonMascot size="sm" mood="happy" animate={false} />
              <div>
                <h2 className="font-display text-xl font-semibold">
                  Teacher profile
                </h2>
                <p className="text-sm text-muted-foreground">
                  Grades you teach, optional topics, and your class list.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <LabelRegister isRequired={true}>Student grades</LabelRegister>
              <SelectRegister
                name="teacherGrades"
                value={formData.teacherGrades}
                onChange={handleChange}
                options={gradeOptions}
              />
            </div>

            <div className="space-y-2">
              <LabelRegister isRequired={false}>Learning topics</LabelRegister>
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
                    ? "Topics unavailable — you can continue without them"
                    : "Choose topics or tags"
                }
                noOptionsMessage={() =>
                  topicsLoadError ? topicsLoadError : "No topics or tags found"
                }
              />
              {topicsLoadError && (
                <p className="text-destructive mt-1 text-sm">{topicsLoadError}</p>
              )}
            </div>

            <div className="border-border border-t pt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <LabelRegister isRequired={false}>Pupils list</LabelRegister>
                <button
                  type="button"
                  onClick={addPupil}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  + Add pupil
                </button>
              </div>

              <div className="bg-input border-border max-h-60 overflow-y-auto rounded-xl border p-3">
                <table className="w-full table-fixed text-left text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-border border-b">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Surname</th>
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
                            placeholder="Name"
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
                            placeholder="Surname"
                            className="bg-background border-border w-full rounded-lg border px-2 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          />
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            aria-label={`Remove pupil ${index + 1}`}
                            onClick={() => removePupil(index)}
                            className="text-destructive hover:text-destructive/90 px-2 font-bold transition-colors"
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
                    No pupils added yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {emptyError && (
          <ValidateError>Please select how you&apos;ll use CineLingo.</ValidateError>
        )}
        {formError && <ValidateError>{formError}</ValidateError>}

        <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-stretch">
          <Button type="submit" disabled={isSubmitting} className="py-6 sm:flex-1">
            {formData.role === "teacher" ? "Register" : "Next"}
          </Button>
          <Button
            type="button"
            onClick={() => navigate("/registrationMain")}
            className="border-border hover:bg-muted sm:flex-1 border bg-transparent py-6 text-muted-foreground hover:text-foreground"
          >
            Previous step
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
