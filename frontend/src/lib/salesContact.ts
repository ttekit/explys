/**
 * Contact Sales link for B2B pricing tier (`VITE_SALES_CONTACT_URL` or mailto from `VITE_SALES_CONTACT_EMAIL`).
 */
export function getSalesContactHref(): string {
  const url = import.meta.env.VITE_SALES_CONTACT_URL;
  if (typeof url === "string" && url.trim().length > 0) {
    return url.trim();
  }
  const email = import.meta.env.VITE_SALES_CONTACT_EMAIL;
  if (typeof email === "string" && email.trim().length > 0) {
    const e = email.trim();
    return `mailto:${e}?subject=${encodeURIComponent("Explys — Teacher / Enterprise plan")}`;
  }
  return "mailto:sales@explys.com?subject=Explys%20%E2%80%94%20Teacher%20%2F%20Enterprise%20plan";
}
