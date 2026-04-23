import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { Link, useNavigate } from "react-router";
import SelectRegister from "../../components/SelectRegister";
import { useState, useContext, ChangeEvent, FormEvent } from "react";
import { RegistrationContext } from "./RegistrationContext";
import MultiSelect from "../../components/MultiSelect";
import type { MultiValue } from "react-select";

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

  const hobbyOptions: { value: string; label: string }[] = [
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
    { value: "cybersecurity", label: "Cybersecurity" },
    { value: "design", label: "UI/UX Design" },

    { value: "reading", label: "Reading" },
    { value: "traveling", label: "Traveling" },
    { value: "gardening", label: "Gardening" },
    { value: "chess", label: "Chess" },
    { value: "movies", label: "Movies & Cinema" },
  ];

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value } as Record<string, string>);
  };

  const handleHobbyChange = (
    selected: MultiValue<{ value: string; label: string }>,
  ) => {
    updateFormData({ hobbies: selected.map((option) => option.value) });
  };

  const handleNext = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.englishLevel == "choose") {
      setEmptyError(true);
    } else {
      setEmptyError(false);
      navigate("/registrationPreferences");
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-2">
        <form
          className="w-full max-w-100 bg-(--gray-background) rounded-[40px] shadow-[0_20px_20px_rgba(0,0,0,0.1)] p-7 flex flex-col"
          onSubmit={handleNext}
          tabIndex={0}
        >
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              Create an account
            </p>
            <div className="flex">
              <p className="text-gray-500 mb-8">Account Credentials</p>
              <p>- Page 2</p>
            </div>
          </div>
          <div className="mb-1.5 flex flex-col">
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={true}>English level:</LabelRegister>
            </div>
            <SelectRegister
              name="englishLevel"
              value={formData.englishLevel}
              onChange={handleChange}
              options={engLevels}
            />
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={false}>Hobbies:</LabelRegister>
            </div>
            <MultiSelect
              isMulti
              name="hobbies"
              placeholder="Choose hobbies"
              options={hobbyOptions}
              onChange={handleHobbyChange}
            />
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={false}>Education:</LabelRegister>
            </div>
            <SelectRegister
              name="education"
              value={formData.education}
              onChange={handleChange}
              options={educationLevels}
            />
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={false}>Field of work:</LabelRegister>
            </div>
            <SelectRegister
              name="workField"
              value={formData.workField}
              onChange={handleChange}
              options={workFields}
            />
            {emptyError && (
              <ValidateError>Please fill in all required fields.</ValidateError>
            )}
          </div>
          <div>
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
    </>
  );
}
