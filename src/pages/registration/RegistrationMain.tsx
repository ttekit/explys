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
  const [errorText, setErrorText] = useState<string | null>(null);
  const navigate = useNavigate();

  const isValidPasswordRegex: RegExp =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const validateField = (
    value: string,
    type: "password" | "email" | "other",
  ) => {
    if (type === "password") {
      if (value.length < 8) {
        setErrorText("Password must be at least 8 characters.");
        return false;
      }
      if (!/[A-Z]/.test(value)) {
        setErrorText("Password must contain at least one uppercase letter.");
        return false;
      }
      if (!/[a-z]/.test(value)) {
        setErrorText("Password must contain at least one lowercase letter.");
        return false;
      }
      if (!/\d/.test(value)) {
        setErrorText("Password must contain at least one number.");
        return false;
      }
      if (!/[@$!%*?&]/.test(value)) {
        setErrorText("Password must contain at least one special character.");
        return false;
      }
    }

    if (type === "email") {
      if (!/^\S+@\S+\.\S+$/.test(value)) {
        setErrorText("Invalid email format.");
        return false;
      }
    }

    if (type === "other") {
      if (value.trim() === "") {
        setErrorText("Please fill in all required fields.");
        return false;
      }
    }

    setErrorText(null);
    return true;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
    type: "password" | "email" | "other",
  ) => {
    validateField(e.target.value, type);
    const { name, value } = e.target;
    updateFormData({ [name]: value } as Record<string, string>);
  };

  const handleNext = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.email ||
      !/^\S+@\S+\.\S+$/.test(formData.email) ||
      !formData.password ||
      !isValidPasswordRegex.test(formData.password)
    ) {
      setErrorText("Please fill in all required fields correctly.");
    } else {
      setErrorText(null);
      navigate("/registrationDetails");
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
          tabIndex={0}
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
              onChange={(e) => handleChange(e, "other")}
              type="text"
              placeholder="Username"
            />
            <LabelRegister isRequired={true}>Email</LabelRegister>
            <InputText
              name="email"
              value={formData.email}
              onChange={(e) => handleChange(e, "email")}
              type="email"
              placeholder="Email"
            />
            <LabelRegister isRequired={true}>Password</LabelRegister>
            <InputText
              name="password"
              value={formData.password}
              onChange={(e) => handleChange(e, "password")}
              type="password"
              placeholder="Create password"
            />
            <LabelRegister isRequired={true}>Confirm password</LabelRegister>
            <InputText
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => handleChange(e, "password")}
              type="password"
              placeholder="Confirm password"
            />
            {errorText && <ValidateError>{errorText}</ValidateError>}
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
