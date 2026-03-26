import InputText from "../../components/InputText";
import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { Link, useNavigate } from "react-router";
import SelectRegister from "../../components/SelectRegister";
import { useState, useContext, ChangeEvent, FormEvent } from "react";
import { RegistrationContext } from "./RegistrationContext";

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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value } as Record<string, string>);
  };

  const handleNext = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.englishLevel == "choose") {
      setEmptyError(true);
      console.log("error");
    } else {
      setEmptyError(false);
      navigate("/registrationPreferences");
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center">
        <form
          className="w-full max-w-75 mx-auto flex flex-col items-center justify-center rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.15)] my-5 pb-5"
          onSubmit={handleNext}
          tabIndex={0}
        >
          <div className="justify-start my-2">
            <p className="font-bold text-2xl m-0">Create an account</p>
            <div className="flex">
              <p className="font-semibold m-0 pr-1">Account Credentials</p>
              <p>- Page 2</p>
            </div>
          </div>
          <div className="mb-1.5 flex flex-col">
            <LabelRegister isRequired={true}>English level:</LabelRegister>
            <SelectRegister
              name="englishLevel"
              value={formData.englishLevel}
              onChange={handleChange}
              options={engLevels}
            />

            <LabelRegister isRequired={false}>Hobbies:</LabelRegister>
            <InputText
              name="hobbies"
              value={formData.hobbies}
              onChange={handleChange}
              type="text"
              placeholder="Select"
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
        </form>
      </div>
    </>
  );
}
