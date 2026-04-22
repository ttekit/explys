import Button from "../../components/Button";
import InputText from "../../components/InputText";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { useState, ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";

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
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
          {
            method: "POST",
            headers: {
              "Content-type": "application/json",
            },
            body: JSON.stringify(loginData),
          },
        );

        if (response.ok) {
          navigate("/");
          console.log("Logged in");
        } else {
          const errorData = await response.json();
          console.error(errorData);
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      setEmptyError(true);
      console.log("error");
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
                placeholder="Create password"
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
