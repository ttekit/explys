"use client";

import { Suspense, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/Button";
import InputText from "@/components/InputText";
import LabelRegister from "@/components/LabelRegister";
import ValidateError from "@/components/ValidateError";
import { apiLogin } from "@/lib/api";
import { setSession } from "@/lib/session";

function LoginFormInner() {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [emptyError, setEmptyError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/video-page";

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
        const session = await apiLogin(
          loginData.email.trim(),
          loginData.password,
        );
        setSession(session);
        toast.success("Signed in successfully.");
        router.push(next);
        router.refresh();
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
    <div className="min-h-screen flex items-center justify-center p-2">
      <form
        className="w-full max-w-100 bg-(--gray-background) rounded-[40px] shadow-[0_20px_20px_rgba(0,0,0,0.1)] p-7 flex flex-col"
        onSubmit={handleLogin}
        tabIndex={0}
      >
        <div>
          <p className="text-3xl font-bold text-gray-900 mb-1">Welcome back</p>
          <p className="text-gray-500 mb-8">Sign in to continue learning!</p>
        </div>
        <div className="space-y-2 flex flex-col">
          <div className="flex flex-row justify-end">
            <LabelRegister isRequired>Email</LabelRegister>
          </div>
          <InputText
            name="email"
            value={loginData.email}
            onChange={handleChange}
            type="email"
            placeholder="Email"
            autoComplete="email"
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
            <LabelRegister isRequired>Password</LabelRegister>
          </div>
          <div className="flex">
            <InputText
              name="password"
              value={loginData.password}
              onChange={handleChange}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
            />
          </div>
          {emptyError ? (
            <ValidateError>Please fill in all required fields.</ValidateError>
          ) : null}
        </div>
        <div>
          <Button type="submit">Login</Button>
          <Button type="button" onClick={() => router.push("/video-page")}>
            Back
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center pt-2">
          <p className="opacity-70">Don&apos;t have an account?</p>
          <Link href="/register">
            <p className="text-(--purple-default) font-semibold hover:text-(--purple-hover) transition duration-500 ease-in-out">
              Create one
            </p>
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-500">
          <Link className="underline" href="/dashboard">
            API dashboard
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-zinc-500">
          Loading…
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
