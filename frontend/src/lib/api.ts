export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== "string" || !raw.trim()) {
    return "";
  }
  return raw.replace(/\/+$/, "");
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Add it to your .env file (e.g. VITE_API_BASE_URL=http://localhost:3000).",
    );
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export async function getResponseErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === "object" && "message" in data) {
      const msg = (data as { message: unknown }).message;
      if (typeof msg === "string") return msg;
      if (Array.isArray(msg) && msg.every((m) => typeof m === "string")) {
        return msg.join(", ");
      }
    }
  } catch {
    /* not JSON */
  }
  return response.statusText || `Request failed (${response.status})`;
}
