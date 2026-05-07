import Button from "../../components/Button";
import InputText from "../../components/InputText";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { useState, ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import {
  apiFetch,
  getResponseErrorMessage,
  setStoredAccessToken,
} from "../../lib/api";
import { useUser } from "../../context/UserContext";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";

export default function LoginForm() {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [emptyError, setEmptyError] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const navigate = useNavigate();
  const { refreshProfile } = useUser();

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
        const response = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify(loginData),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            access_token?: string;
          };
          const token = data.access_token;
          if (!token) {
            toast.success("Signed in successfully.");
            navigate("/catalog");
          } else {
            setStoredAccessToken(token);
            await refreshProfile();
            toast.success("Signed in successfully.");
            navigate("/catalog");
          }
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
    <AuthSplitLayout
      rightTitle="Ready to continue?"
      rightSubtitle="Pick up right where you left off with your personalized learning path."
    >
      <div className="mb-2 flex items-center gap-3">
        <img src="/Icon.svg" className="w-12 h-15" />
        <h1 className="font-display text-2xl font-bold">Welcome back</h1>
      </div>
      <p className="mb-8 text-muted-foreground">
        Continue your learning journey
      </p>

      <form onSubmit={handleLogin} tabIndex={0} className="space-y-5">
        <div className="space-y-2">
          <LabelRegister isRequired={true}>Email</LabelRegister>
          <InputText
            name="email"
            value={loginData.email}
            onChange={handleChange}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <LabelRegister isRequired={true}>Password</LabelRegister>
            <Link
              to="#"
              className="text-sm text-primary hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <InputText
              name="password"
              value={loginData.password}
              onChange={handleChange}
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="pr-12"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? (
                <EyeOff className="size-5 opacity-70" />
              ) : (
                <Eye className="size-5 opacity-70" />
              )}
            </button>
          </div>
        </div>

        {emptyError && (
          <ValidateError>Please fill in all required fields.</ValidateError>
        )}

        <Button
          type="submit"
          className="rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
        >
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          to="/registrationMain"
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>

      <Link
        to="/"
        className="mt-8 inline-block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back home
      </Link>
    </AuthSplitLayout>
  );
}
