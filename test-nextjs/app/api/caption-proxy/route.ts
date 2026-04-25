import { NextRequest, NextResponse } from "next/server";

const MAX_VTT_BYTES = 2 * 1024 * 1024;

/**
 * Resolves to true for typical public S3/CloudFront object URLs. Extend via
 * CAPTION_PROXY_ALLOW_HOSTS (comma‑separated hostnames) for custom domains.
 */
function isAllowedUrl(href: string): boolean {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const h = u.hostname;
  if (h.endsWith(".s3.amazonaws.com") || h.endsWith(".s3-website.amazonaws.com")) {
    return true;
  }
  if (h.includes(".s3.") && h.endsWith(".amazonaws.com")) {
    return true;
  }
  if (h.startsWith("s3.") && h.endsWith(".amazonaws.com")) {
    return true;
  }
  const extra = process.env.CAPTION_PROXY_ALLOW_HOSTS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
  for (const host of extra) {
    if (h === host || h.endsWith(`.${host}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Fetches a remote WebVTT from an allowed host (avoids browser CORS on S3/CloudFront).
 */
export async function GET(request: NextRequest) {
  const href = request.nextUrl.searchParams.get("url");
  if (!href || !isAllowedUrl(href)) {
    return NextResponse.json(
      { error: "Invalid or disallowed url" },
      { status: 400 },
    );
  }
  try {
    const res = await fetch(href, {
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream HTTP ${res.status}` },
        { status: 502 },
      );
    }
    const len = res.headers.get("content-length");
    if (len && Number.parseInt(len, 10) > MAX_VTT_BYTES) {
      return NextResponse.json(
        { error: "File too large" },
        { status: 413 },
      );
    }
    const text = await res.text();
    if (text.length > MAX_VTT_BYTES) {
      return NextResponse.json(
        { error: "File too large" },
        { status: 413 },
      );
    }
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
