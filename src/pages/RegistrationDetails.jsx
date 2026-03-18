import InputText from "../components/InputText";
import Button from "../components/Button";
import LabelRegister from "../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import SelectRegister from "../components/SelectRegister";
import { useContext } from "react";
import { RegistrationContext } from "./RegistrationContext";

export default function RegistrationDetails() {
  const { formData, updateFormData } = useContext(RegistrationContext);
  const navigate = useNavigate();

  const engLevels = [
    { value: "choose", text: "Choose level" },
    { value: "starter", text: "Starter" },
    { value: "beginner", text: "Beginner" },
    { value: "pre-intermediate", text: "Pre-Intermediate" },
    { value: "intermediate", text: "Intermediate" },
    { value: "upper-intermediate", text: "Upper-Intermediate" },
    { value: "advanced", text: "Advanced" },
    { value: "proficiency", text: "Proficiency" },
  ];

  const educationLevels = [
    { value: "choose", text: "Choose education level" },
    { value: "school", text: "Secondary School" },
    { value: "high-school", text: "High School Diploma" },
    { value: "college", text: "College" },
    { value: "bachelor", text: "Bachelor's Degree" },
    { value: "master", text: "Master's Degree" },
    { value: "phd", text: "PhD / Doctorate" },
    { value: "other", text: "Other" },
  ];

  const workFields = [
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

  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value });
  };

  const handleNext = (e) => {
    e.preventDefault();
    navigate("/registrationPreferences");
  };

  return (
    <>
      <form className="flex flex-col items-center justify-center" onSubmit={handleNext}>
        <h3 className="font-bold">Registration</h3>
        <div className="mb-1.5 flex flex-col items-center justify-center">
          <LabelRegister>English level:</LabelRegister>
          <SelectRegister name="englishLevel" value={formData.englishLevel} onChange={handleChange} options={engLevels} />

          <LabelRegister>Hobbies:</LabelRegister>
          <InputText name="hobbies" value={formData.hobbies} onChange={handleChange} type="text" placeholder="Select" />

          <LabelRegister>Education:</LabelRegister>
          <SelectRegister name="education" value={formData.education} onChange={handleChange} options={educationLevels} />

          <LabelRegister>Work field:</LabelRegister>
          <SelectRegister name="workField" value={formData.workField} onChange={handleChange} options={workFields} />
        </div>
        <div>
          <Button type="submit">Next</Button>
          <Link to="/registrationMain">
            <Button type="button">Back</Button>
          </Link>
        </div>
      </form>
    </>
  );
}