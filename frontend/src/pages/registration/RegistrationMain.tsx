import InputText from "../../components/InputText";
import Button from "../../components/Button";
import ValidateError from "../../components/ValidateError";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, useState, ChangeEvent, FormEvent } from "react";
import { RegistrationContext } from "../../context/RegistrationContext";
import { Eye, EyeOff } from "lucide-react";

export default function RegistrationMain() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const navigate = useNavigate();

  /** At least 8 chars; must include upper, lower, digit, and one of @$!%*?& (any other chars allowed). */
  const isValidPassword = (p: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(p);

  const validateField = (
    value: string,
    type: "password" | "email" | "confirmPassword" | "other",
    passwordToCompare?: string,
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
        setErrorText(
          "Password must contain at least one of: @ $ ! % * ? &",
        );
        return false;
      }
    }

    if (type == "confirmPassword") {
      const pw = passwordToCompare ?? formData.password;
      if (value != pw) {
        setErrorText("Passwords do not match.");
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
    type: "password" | "email" | "confirmPassword" | "other",
  ) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value } as Record<string, string>);

    const passFromForm =
      (e.currentTarget.form?.querySelector<HTMLInputElement>(
        'input[name="password"]',
      )?.value) ?? formData.password;
    if (type === "confirmPassword") {
      validateField(value, "confirmPassword", passFromForm);
    } else {
      validateField(value, type);
    }
  };

  const handleNext = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");
    updateFormData({ name, email, password, confirmPassword });

    if (!name) {
      setErrorText("Username is required.");
      return;
    }
    if (!email) {
      setErrorText("Email is required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrorText("Invalid email format.");
      return;
    }
    if (!password) {
      setErrorText("Password is required.");
      return;
    }
    if (!isValidPassword(password)) {
      if (password.length < 8) {
        setErrorText("Password must be at least 8 characters.");
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setErrorText("Password must contain at least one uppercase letter.");
        return;
      }
      if (!/[a-z]/.test(password)) {
        setErrorText("Password must contain at least one lowercase letter.");
        return;
      }
      if (!/\d/.test(password)) {
        setErrorText("Password must contain at least one number.");
        return;
      }
      if (!/[@$!%*?&]/.test(password)) {
        setErrorText("Password must contain at least one of: @ $ ! % * ? &");
        return;
      }
      setErrorText("Password does not meet the requirements.");
      return;
    }
    if (!confirmPassword) {
      setErrorText("Please confirm your password.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorText("Passwords do not match.");
      return;
    }
    setErrorText(null);
    navigate("/registrationDetails");
  };

  const handleBack = () => {
    updateFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      englishLevel: "choose",
      hobbies: [],
      education: "choose",
      workField: "choose",
      favoriteGenres: [],
      hatedGenres: [],
    });
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
              <p>- Page 1</p>
            </div>
          </div>
          <div className="space-y-2 flex flex-col">
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={true}>Username</LabelRegister>
            </div>
            <InputText
              name="name"
              value={formData.name}
              onChange={(e) => handleChange(e, "other")}
              type="text"
              placeholder="Enter your username"
            />
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={true}>Email</LabelRegister>
            </div>
            <InputText
              name="email"
              value={formData.email}
              onChange={(e) => handleChange(e, "email")}
              type="email"
              placeholder="Enter your email"
            />
            <div className="flex flex-row justify-end">
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOff className="opacity-60 w-6 h-6 pr-1" />
                ) : (
                  <Eye className="opacity-60 w-6 h-6 pr-1" />
                )}
              </button>
              <LabelRegister isRequired={true}>Password</LabelRegister>
            </div>
            <div className="flex">
              <InputText
                name="password"
                value={formData.password}
                onChange={(e) => handleChange(e, "password")}
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
              />
            </div>
            <div className="flex flex-row justify-end">
              <button
                type="button"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                aria-pressed={showConfirmPassword}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="opacity-60 w-6 h-6 pr-1" />
                ) : (
                  <Eye className="opacity-60 w-6 h-6 pr-1" />
                )}
              </button>
              <LabelRegister isRequired={true}>Confirm password</LabelRegister>
            </div>
            <div className="flex">
              <InputText
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleChange(e, "confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
              />
            </div>
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
