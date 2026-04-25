import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Eng Curses API test UI
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        Next.js shell to try authentication (including <code className="text-sm">role</code>{" "}
        and teacher/student fields), the users API, and the entry placement test
        against your Nest backend. Configure the API base URL in{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
          .env.local
        </code>{" "}
        as <code className="text-sm">NEXT_PUBLIC_API_URL</code>.
      </p>
      <ul className="mt-8 space-y-2 text-zinc-700 dark:text-zinc-300">
        <li>
          <Link
            className="font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-2 dark:text-zinc-100"
            href="/register"
          >
            Register
          </Link>{" "}
          — <code>POST /auth/register</code>
        </li>
        <li>
          <Link
            className="font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-2 dark:text-zinc-100"
            href="/login"
          >
            Log in
          </Link>{" "}
          — <code>POST /auth/login</code>
        </li>
        <li>
          <Link
            className="font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-2 dark:text-zinc-100"
            href="/dashboard"
          >
            Dashboard
          </Link>{" "}
          — <code>GET /users/:id</code>, <code>GET /users</code>,{" "}
          <code>GET /placement-test/status</code>, placement iframe
        </li>
      </ul>
    </main>
  );
}
