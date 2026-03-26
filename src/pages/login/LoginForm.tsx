import Button from "../../components/Button";
import InputText from "../../components/InputText";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { useState, ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router";

export default function LoginForm() {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [emptyError, setEmptyError] = useState(false);
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
      <div className="min-h-screen flex items-center justify-center">
        <form
          className="w-full max-w-75 mx-auto flex flex-col items-center justify-center rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.15)] my-5 pb-5"
          onSubmit={handleLogin}
          tabIndex={0}
        >
          <div className="justify-center my-2">
            <p className="font-bold text-2xl">Welcome back</p>
            <div className="flex">
              <p className="font-semibold pr-1">
                Sign in to continue learning!
              </p>
            </div>
          </div>
          <div className="mb-1.5 flex flex-col w-fit">
            <LabelRegister isRequired={true}>Email</LabelRegister>
            <InputText
              name="email"
              value={loginData.email}
              onChange={handleChange}
              type="email"
              placeholder="Email"
            />
            <LabelRegister isRequired={true}>Password</LabelRegister>
            <InputText
              name="password"
              value={loginData.password}
              onChange={handleChange}
              type="password"
              placeholder="Create password"
            />
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
        </form>
      </div>
    </>
  );
}
