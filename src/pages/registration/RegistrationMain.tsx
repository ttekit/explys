import InputText from "../../components/InputText";
import Button from "../../components/Button";
import ValidateError from "../../components/ValidateError";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, useState, ChangeEvent, FormEvent } from "react";
import { RegistrationContext } from "./RegistrationContext";

export default function RegistrationMain() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const [emptyError, setEmptyError] = useState(false);
  const navigate = useNavigate();

  const isEmpty = [
    formData.name,
    formData.email,
    formData.password,
    formData.confirmPassword,
  ].some((value) => value.trim() === "");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value } as Record<string, string>);
  };

  const handleNext = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isEmpty) {
      setEmptyError(false);
      navigate("/registrationDetails");
    } else {
      setEmptyError(true);
      console.log("error");
    }
  };

  const handleBack = () => {
    updateFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      englishLevel: "choose",
      hobbies: "",
      education: "choose",
      workField: "choose",
      favoriteGenres: "",
      hatedGenres: "",
    });
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center">
        <form
          className="w-full max-w-75 mx-auto flex flex-col items-center justify-center rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.15)] my-5 pb-5"
          onSubmit={handleNext}
        >
          <div className="justify-start my-2">
            <p className="font-bold text-2xl m-0">Create an account</p>
            <div className="flex">
              <p className="font-semibold m-0 pr-1">Account Credentials</p>
              <p>- Page 1</p>
            </div>
          </div>
          <div className="mb-1.5 flex flex-col w-fit">
            <LabelRegister isRequired={true}>Username</LabelRegister>
            <InputText
              name="name"
              value={formData.name}
              onChange={handleChange}
              type="text"
              placeholder="Username"
            />
            <LabelRegister isRequired={true}>Email</LabelRegister>
            <InputText
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              placeholder="Email"
            />
            <LabelRegister isRequired={true}>Password</LabelRegister>
            <InputText
              name="password"
              value={formData.password}
              onChange={handleChange}
              type="password"
              placeholder="Create password"
            />
            <LabelRegister isRequired={true}>Confirm password</LabelRegister>
            <InputText
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              type="password"
              placeholder="Confirm password"
            />
            {emptyError && (
              <ValidateError>Please fill in all required fields.</ValidateError>
            )}
          </div>
          <div>
            <Button type="submit">Next</Button>
            <Link to="/">
              <Button type="button" onClick={handleBack}>
                Back
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
