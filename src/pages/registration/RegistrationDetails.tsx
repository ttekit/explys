import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { Link, useNavigate } from "react-router";
import SelectRegister from "../../components/SelectRegister";
import { useState, useContext, ChangeEvent, FormEvent } from "react";
import { RegistrationContext } from "../../context/RegistrationContext";
import Select from "react-select";

interface SelectOption {
  value: string;
  text: string;
}

export default function RegistrationDetails() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const [emptyError, setEmptyError] = useState(false);
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

  const engLevels: SelectOption[] = [
    { value: "choose", text: "Choose level" },
    { value: "starter", text: "Starter" },
    { value: "beginner", text: "Beginner" },
    { value: "pre-intermediate", text: "Pre-Intermediate" },
    { value: "intermediate", text: "Intermediate" },
    { value: "upper-intermediate", text: "Upper-Intermediate" },
    { value: "advanced", text: "Advanced" },
    { value: "proficiency", text: "Proficiency" },
  ];

  const educationLevels: SelectOption[] = [
    { value: "choose", text: "Choose education level" },
    { value: "school", text: "Secondary School" },
    { value: "high-school", text: "High School Diploma" },
    { value: "college", text: "College" },
    { value: "bachelor", text: "Bachelor's Degree" },
    { value: "master", text: "Master's Degree" },
    { value: "phd", text: "PhD / Doctorate" },
    { value: "other", text: "Other" },
  ];

  const workFields: SelectOption[] = [
    { value: "choose", text: "Choose field of work" },
    { value: "it", text: "IT / Software Development" },
    { value: "education", text: "Education / Teaching" },
    { value: "healthcare", text: "Healthcare / Medicine" },
    { value: "finance", text: "Finance / Banking" },
    { value: "marketing", text: "Marketing / Advertising" },
    { value: "sales", text: "Sales" },
    { value: "engineering", text: "Engineering" },
    { value: "law", text: "Law / Legal Services" },
    { value: "business", text: "Business / Management" },
    { value: "design", text: "Design / Creative" },
    { value: "customer-support", text: "Customer Support" },
    { value: "hospitality", text: "Hospitality / Tourism" },
    { value: "logistics", text: "Logistics / Transportation" },
    { value: "student", text: "Student" },
    { value: "unemployed", text: "Unemployed" },
    { value: "other", text: "Other" },
  ];

  const hobbyOptions = [
    { value: "football", label: "Football" },
    { value: "basketball", label: "Basketball" },
    { value: "yoga", label: "Yoga" },
    { value: "gym", label: "Gym & Fitness" },
    { value: "swimming", label: "Swimming" },
    { value: "cycling", label: "Cycling" },
    { value: "painting", label: "Painting" },
    { value: "photography", label: "Photography" },
    { value: "music", label: "Music" },
    { value: "dancing", label: "Dancing" },
    { value: "cooking", label: "Cooking" },
    { value: "writing", label: "Writing" },
    { value: "gaming", label: "Gaming" },
    { value: "coding", label: "Coding" },
    { value: "reading", label: "Reading" },
    { value: "traveling", label: "Traveling" },
    { value: "chess", label: "Chess" },
    { value: "movies", label: "Movies & Cinema" },
  ];

  const topicOptions = [
    { value: "grammar", label: "Grammar" },
    { value: "vocabulary", label: "Vocabulary" },
    { value: "speaking", label: "Speaking" },
    { value: "listening", label: "Listening" },
    { value: "writing", label: "Writing" },
    { value: "reading", label: "Reading" },
    { value: "pronunciation", label: "Pronunciation" },
  ];

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value } as Record<string, string>);
  };

  const handleMultiSelectChange = (name: string) => (selectedOptions: any) => {
    const values = selectedOptions
      ? selectedOptions.map((option: any) => option.value)
      : [];
    updateFormData({ [name]: values } as any);
  };

  const handleNext = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let hasError = false;

    if (formData.role === "choose") {
      hasError = true;
    } else if (
      formData.role === "teacher" &&
      formData.teacherGrades === "choose"
    ) {
      hasError = true;
    } else if (
      formData.role === "student" &&
      (formData.studentGrade === "choose" || formData.englishLevel === "choose")
    ) {
      hasError = true;
    } else if (
      formData.role === "adult" &&
      formData.englishLevel === "choose"
    ) {
      hasError = true;
    }

    if (hasError) {
      setEmptyError(true);
    } else {
      setEmptyError(false);
      navigate("/registrationPreferences");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2">
      <form
        className="w-full max-w-100 bg-(--gray-background) rounded-[40px] shadow-[0_20px_20px_rgba(0,0,0,0.1)] p-7 flex flex-col"
        onSubmit={handleNext}
      >
        <div>
          <p className="text-3xl font-bold text-gray-900 mb-1">Create an account</p>
          <div className="flex text-gray-500 mb-8">
            <p>Profile Details</p>
            <p className="ml-1">- Page 2</p>
          </div>
        </div>

        <div className="mb-4 flex flex-col w-full px-5">
          <LabelRegister isRequired={true}>I am a:</LabelRegister>
          <SelectRegister
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={roleOptions}
          />

          {formData.role === "teacher" && (
            <>
              <LabelRegister isRequired={true}>Student grades:</LabelRegister>
              <SelectRegister
                name="teacherGrades"
                value={formData.teacherGrades}
                onChange={handleChange}
                options={gradeOptions}
              />
              <LabelRegister isRequired={false}>Learning topics:</LabelRegister>
              <Select
                options={topicOptions}
                isMulti
                name="teacherTopics"
                placeholder="Choose topics"
                onChange={handleMultiSelectChange("teacherTopics")}
                onMenuOpen={() => { }}
                onMenuClose={() => { }}
              />
              <LabelRegister isRequired={false}>Student list (comma separated):</LabelRegister>
              <textarea
                name="studentNames"
                value={formData.studentNames}
                onChange={handleChange}
                className="w-full p-2 border rounded-md resize-y"
                placeholder="Alice, Bob, Charlie..."
                rows={3}
              />
            </>
          )}

          {formData.role === "student" && (
            <>
              <LabelRegister isRequired={true}>Grade:</LabelRegister>
              <SelectRegister
                name="studentGrade"
                value={formData.studentGrade}
                onChange={handleChange}
                options={gradeOptions}
              />
              <LabelRegister isRequired={true}>English level:</LabelRegister>
              <SelectRegister
                name="englishLevel"
                value={formData.englishLevel}
                onChange={handleChange}
                options={engLevels}
              />
              <LabelRegister isRequired={false}>Problem topics:</LabelRegister>
              <Select
                options={topicOptions}
                isMulti
                name="studentProblemTopics"
                placeholder="Choose topics"
                onChange={handleMultiSelectChange("studentProblemTopics")}
                onMenuOpen={() => { }}
                onMenuClose={() => { }}
              />
            </>
          )}

          {formData.role === "adult" && (
            <>
              <LabelRegister isRequired={true}>English level:</LabelRegister>
              <SelectRegister
                name="englishLevel"
                value={formData.englishLevel}
                onChange={handleChange}
                options={engLevels}
              />
              <LabelRegister isRequired={false}>Hobbies:</LabelRegister>
              <Select
                options={hobbyOptions}
                isMulti
                name="hobbies"
                placeholder="Choose hobbies"
                onChange={handleMultiSelectChange("hobbies")}
                onMenuOpen={() => { }}
                onMenuClose={() => { }}
              />
              <LabelRegister isRequired={false}>Education:</LabelRegister>
              <SelectRegister
                name="education"
                value={formData.education}
                onChange={handleChange}
                options={educationLevels}
              />
              <LabelRegister isRequired={false}>Field of work:</LabelRegister>
              <SelectRegister
                name="workField"
                value={formData.workField}
                onChange={handleChange}
                options={workFields}
              />
            </>
          )}

          {emptyError && (
            <ValidateError>Please fill in all required fields.</ValidateError>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="submit">Next</Button>
          <Link to="/registrationMain">
            <Button type="button">Back</Button>
          </Link>
        </div>

        <div className="mt-6 flex justify-center gap-4 text-gray-500 font-medium">
          <p className="opacity-70">Already have an account?</p>
          <Link to="/loginForm">
            <p className="text-[#7c66f5] hover:underline">Sign in</p>
          </Link>
        </div>
      </form>
    </div>
  );
}