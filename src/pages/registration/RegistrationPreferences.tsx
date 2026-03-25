import InputText from "../../components/InputText";
import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, ChangeEvent, FormEvent } from "react";
import { RegistrationContext } from "./RegistrationContext";

export default function RegistrationPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");
  
  const { formData, updateFormData } = context;
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value } as Record<string, string>);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );

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
      <div className="min-h-screen flex items-center justify-center">
        <form
          className="w-full max-w-75 mx-auto flex flex-col items-center justify-center rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.15)] my-5 pb-5"
          onSubmit={handleSubmit}
        >
          <div className="justify-start my-2">
            <p className="font-bold text-2xl m-0">Create an account</p>
            <div className="flex">
              <p className="font-semibold m-0 pr-1">Account Credentials</p>
              <p>- Page 3</p>
            </div>
          </div>
          <div className="mb-1.5 flex flex-col">
            <LabelRegister isRequired={false}>Favorite genres:</LabelRegister>
            <InputText
              name="favoriteGenres"
              value={formData.favoriteGenres}
              onChange={handleChange}
              type="text"
              placeholder="Select"
            />
            <LabelRegister isRequired={false}>Hated genres:</LabelRegister>
            <InputText
              name="hatedGenres"
              value={formData.hatedGenres}
              onChange={handleChange}
              type="text"
              placeholder="Select"
            />
          </div>
          <div>
            <Button type="submit">Register</Button>
            <Link to="/registrationDetails">
              <Button type="button">Back</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}

