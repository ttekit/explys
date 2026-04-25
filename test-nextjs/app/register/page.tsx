"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRegister } from "@/lib/api";
import { setSession } from "@/lib/session";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [englishLevel, setEnglishLevel] = useState("B1");
  const [hobbies, setHobbies] = useState("reading, music");
  const [education, setEducation] = useState("");
  const [workField, setWorkField] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("uk");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const hobbyList = hobbies
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const session = await apiRegister({
        name: name.trim(),
        email: email.trim(),
        password,
        englishLevel: englishLevel || undefined,
        hobbies: hobbyList.length ? hobbyList : undefined,
        education: education.trim() || undefined,
        workField: workField.trim() || undefined,
        nativeLanguage: nativeLanguage.trim() || undefined,
      });
      setSession(session);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Register
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Calls <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">POST /auth/register</code> — profile fields are optional and feed placement tags.
      </p>
      <form onSubmit={onSubmit} className="mt-6 max-h-[min(70vh,520px)] space-y-3 overflow-y-auto pr-1">
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Name
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Email
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Password
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="8+ chars, upper, lower, digit"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            English level (CEFR)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={englishLevel}
            onChange={(e) => setEnglishLevel(e.target.value)}
            placeholder="A2, B1, …"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Hobbies (comma-separated)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={hobbies}
            onChange={(e) => setHobbies(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Education
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            placeholder="optional"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Work / field
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={workField}
            onChange={(e) => setWorkField(e.target.value)}
            placeholder="optional"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Native language code
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={nativeLanguage}
            onChange={(e) => setNativeLanguage(e.target.value)}
            placeholder="e.g. uk, en"
          />
        </div>
        {error ? (
          <p className="whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link className="text-zinc-900 underline dark:text-zinc-100" href="/login">
          Log in
        </Link>
      </p>
    </main>
  );
}
