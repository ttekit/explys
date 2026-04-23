export function getDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }

  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD ?? "";
  const host = process.env.POSTGRES_HOST ?? "localhost";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const database = process.env.POSTGRES_DB;

  if (!user || !database) {
    throw new Error(
      "Set DATABASE_URL or POSTGRES_USER, POSTGRES_DB, and optionally POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT",
    );
  }

  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
  return `postgresql://${auth}@${host}:${port}/${encodeURIComponent(database)}`;
}
