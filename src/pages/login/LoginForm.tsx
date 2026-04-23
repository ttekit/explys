import Button from "../../components/Button";
import InputText from "../../components/InputText";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { useState, ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { apiUrl, getResponseErrorMessage } from "../../lib/api";

export default function LoginForm() {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [emptyError, setEmptyError] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const navigate = useNavigate();

  const isEmpty = [loginData.email, loginData.password].some(
    (value) => value.trim() === "",
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isEmpty) {
      setEmptyError(false);
      try {
        const response = await fetch(apiUrl("/auth/login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginData),
        });

        if (response.ok) {
          toast.success("Signed in successfully.");
          navigate("/");
        } else {
          const message = await getResponseErrorMessage(response);
          toast.error(message);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not sign in";
        toast.error(message);
      }
    } else {
      setEmptyError(true);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-2">
        <form
          className="w-full max-w-100 bg-(--gray-background) rounded-[40px] shadow-[0_20px_20px_rgba(0,0,0,0.1)] p-7 flex flex-col"
          onSubmit={handleLogin}
          tabIndex={0}
        >
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              Welcome back
            </p>
            <div className="flex">
              <p className="text-gray-500 mb-8">
                Sign in to continue learning!
              </p>
            </div>
          </div>
          <div className="space-y-2 flex flex-col">
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={true}>Email</LabelRegister>
            </div>
            <InputText
              name="email"
              value={loginData.email}
              onChange={handleChange}
              type="email"
              placeholder="Email"
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
                value={loginData.password}
                onChange={handleChange}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
              />
            </div>
            {emptyError && (
              <ValidateError>Please fill in all required fields.</ValidateError>
            )}
          </div>
          <div>
            <Button type="submit">Login</Button>
            <Link to="/">
              <Button type="button">Back</Button>
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center pt-2">
            <p className="opacity-70">Don't have an account?</p>
            <Link to="/registrationMain">
              <p className="text-(--purple-default) font-semibold hover:text-(--purple-hover) transition duration-500 ease-in-out">
                Create one
              </p>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
