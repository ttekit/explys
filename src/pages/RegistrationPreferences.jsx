import InputText from "../components/InputText";
import Button from "../components/Button";
import LabelRegister from "../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext } from "react";
import { RegistrationContext } from "./RegistrationContext";

export default function RegistrationPreferences() {
  const { formData, updateFormData } = useContext(RegistrationContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // const data = await response.json();
        navigate("/login");
      } else {
        const errorData = await response.json();
        console.error(errorData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <form className="flex flex-col items-center justify-center" onSubmit={handleSubmit}>
        <h3 className="font-bold">Registration</h3>
        <div className="mb-1.5 flex flex-col items-center justify-center">
          <LabelRegister>Favorite genres:</LabelRegister>
          <InputText name="favoriteGenres" value={formData.favoriteGenres} onChange={handleChange} type="text" placeholder="Select" />
          <LabelRegister>Hated genres:</LabelRegister>
          <InputText name="hatedGenres" value={formData.hatedGenres} onChange={handleChange} type="text" placeholder="Select" />
        </div>
        <div>
          <Button type="submit">Register</Button>
          <Link to="/registrationDetails">
            <Button type="button">Back</Button>
          </Link>
        </div>
      </form>
    </>
  );
}