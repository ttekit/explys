import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { Link, useNavigate } from "react-router";
import SelectRegister from "../../components/SelectRegister";
import { useState, useContext, ChangeEvent, FormEvent } from "react";
import { RegistrationContext } from "../../context/RegistrationContext";
import MultiSelect from "../../components/MultiSelect";
<<<<<<< HEAD
=======
import { getRegisterCredentialsError, registerUser } from "../../lib/registerUser";
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56

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
<<<<<<< HEAD
=======
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56
  const navigate = useNavigate();

  const roleOptions: SelectOption[] = [
    { value: "choose", text: "Choose your role" },
    { value: "teacher", text: "Teacher" },
    { value: "student", text: "Student" },
    { value: "adult", text: "Adult" },
  ];

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
  ];

  const topicOptions = [
    { value: "grammar", label: "Grammar" },
    { value: "vocabulary", label: "Vocabulary" },
    { value: "speaking", label: "Speaking" },
    { value: "listening", label: "Listening" },
    { value: "writing", label: "Writing" },
    { value: "reading", label: "Reading" },
  ];

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value } as any);
  };

  const handleMultiSelectChange = (name: string) => (selectedOptions: any) => {
    const values = selectedOptions ? selectedOptions.map((o: any) => o.value) : [];
    updateFormData({ [name]: values } as any);
  };

  // Pupils Table Logic
  const pupils: Pupil[] = Array.isArray(formData.studentNames) ? formData.studentNames : [];

  const addPupil = () => {
    updateFormData({ studentNames: [...pupils, { name: "", surname: "" }] } as any);
  };

  const updatePupil = (index: number, field: keyof Pupil, value: string) => {
    const updated = [...pupils];
    updated[index][field] = value;
    updateFormData({ studentNames: updated } as any);
  };

  const removePupil = (index: number) => {
    updateFormData({ studentNames: pupils.filter((_, i) => i !== index) } as any);
  };

<<<<<<< HEAD
  const handleNext = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
=======
  const handleNext = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56
    if (formData.role === "choose") {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);
<<<<<<< HEAD
=======

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
        navigate("/registrationSuccess", {
          state: { generatedStudents: result.generatedStudents },
        });
      } else {
        setFormError(result.message);
      }
      return;
    }

>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56
    navigate("/registrationPreferences");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2">
      <form className="w-full max-w-150 bg-(--gray-background) rounded-[40px] shadow-[0_20px_20px_rgba(0,0,0,0.1)] p-7 flex flex-col" onSubmit={handleNext}>
        <p className="text-3xl font-bold mb-1">Create an account</p>
        <p className="text-gray-500 mb-8">Profile Details - Page 2</p>

        <div className="mb-4 flex flex-col px-5">
          <LabelRegister isRequired={true}>I am a:</LabelRegister>
          <SelectRegister name="role" value={formData.role} onChange={handleChange} options={roleOptions} />

          {formData.role === "teacher" && (
            <div className="mt-4 flex flex-col gap-4">
              <LabelRegister isRequired={true}>Student grades:</LabelRegister>
              <SelectRegister name="teacherGrades" value={formData.teacherGrades} onChange={handleChange} options={gradeOptions} />

              <LabelRegister isRequired={false}>Learning topics:</LabelRegister>
<<<<<<< HEAD
              <Select options={topicOptions} isMulti placeholder="Choose topics" onChange={handleMultiSelectChange("teacherTopics")} onMenuOpen={() => { }} onMenuClose={() => { }} />
=======
              <MultiSelect
                inputId="teacher-topics"
                options={topicOptions}
                isMulti
                placeholder="Choose topics"
                value={topicOptions.filter((o) =>
                  (formData.teacherTopics ?? []).includes(o.value),
                )}
                onChange={handleMultiSelectChange("teacherTopics")}
              />
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56

              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <LabelRegister isRequired={false}>Pupils List:</LabelRegister>
                  <button type="button" onClick={addPupil} className="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">
                    + Add Pupil
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-xl p-2 bg-white">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-sm text-gray-500 border-b">
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Surname</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pupils.map((pupil, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="py-2 pr-2">
                            <input type="text" value={pupil.name} onChange={(e) => updatePupil(index, "name", e.target.value)} placeholder="Name" className="w-full p-1 border rounded" />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="text" value={pupil.surname} onChange={(e) => updatePupil(index, "surname", e.target.value)} placeholder="Surname" className="w-full p-1 border rounded" />
                          </td>
                          <td className="py-2">
                            <button type="button" onClick={() => removePupil(index)} className="text-red-500 font-bold px-2">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pupils.length === 0 && <p className="text-center text-gray-400 py-4">No pupils added yet.</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {emptyError && <ValidateError>Please select a role.</ValidateError>}
<<<<<<< HEAD

        <div className="mt-4 flex gap-2">
          <Button type="submit">Next</Button>
=======
        {formError && <ValidateError>{formError}</ValidateError>}

        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {formData.role === "teacher" ? "Register" : "Next"}
          </Button>
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56
          <Link to="/registrationMain"><Button type="button">Back</Button></Link>
        </div>
      </form>
    </div>
  );
}
