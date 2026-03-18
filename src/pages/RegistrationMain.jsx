import InputText from "../components/InputText";
import Button from "../components/Button";
import { Link, useNavigate } from "react-router";
import { useContext } from "react";
import { RegistrationContext } from "./RegistrationContext";

export default function RegistrationMain() {
  const { formData, updateFormData } = useContext(RegistrationContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value });
  };

  const handleNext = (e) => {
    e.preventDefault();
    navigate("/registrationDetails");
  };

  return (
    <>
      <form className="flex flex-col items-center justify-center" onSubmit={handleNext}>
        <h3 className="font-bold">Registration</h3>
        <div className="mb-1.5 flex flex-col items-center justify-center">
          <InputText name="name" value={formData.username} onChange={handleChange} type="text" placeholder="Username" />
          <InputText name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Email" />
          <InputText name="password" value={formData.password} onChange={handleChange} type="password" placeholder="Create password" />
          <InputText name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} type="password" placeholder="Confirm password" />
        </div>
        <div>
          <Button type="submit">Next</Button>
          <Link to="/">
            <Button type="button">Back</Button>
          </Link>
        </div>
      </form>
    </>
  );
}