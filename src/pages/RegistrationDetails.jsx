import InputText from "../components/InputText";
import Button from "../components/Button";
import LabelRegister from "../components/LabelRegister";
import { Link } from "react-router";
import SelectRegister from "../components/SelectRegister";

export default function RegistrationDetails() {
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

  return (
    <>
      <form className="flex flex-col items-center justify-center">
        <h3 className="font-bold">Registration</h3>
        <div className="mb-1.5 flex flex-col items-center justify-center">
          <LabelRegister>English level:</LabelRegister>
          <SelectRegister options={engLevels} />
          <LabelRegister>Hobbies:</LabelRegister>
          <InputText type="text" placeholder="Select" />
          <LabelRegister>Education:</LabelRegister>
          <SelectRegister options={educationLevels} />
          <LabelRegister>Work field:</LabelRegister>
          <SelectRegister options={workFields} />
        </div>
        <div>
          <Link to="/registrationPreferences">
            <Button>Next</Button>
          </Link>
          <Link to="/registrationMain">
            <Button>Back</Button>
          </Link>
        </div>
      </form>
    </>
  );
}
