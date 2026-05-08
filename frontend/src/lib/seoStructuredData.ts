import { getSiteUrl } from "./siteUrl";

/** Organization + WebSite JSON-LD for the marketing site (no server required). */
export function buildExplysOrganizationJsonLd(origin: string) {
  const logo = `${origin}/Icon.svg`;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Explys",
    url: origin,
    logo,
    description:
      "Personalized English learning through adaptive video lessons, quizzes, and AI-assisted practice.",
  };
}

export function buildExplysWebSiteJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Explys",
    url: origin,
    description:
      "Learn English your way with adaptive video content and interactive lessons.",
    publisher: {
      "@type": "Organization",
      name: "Explys",
      url: origin,
      logo: `${origin}/Icon.svg`,
    },
  };
}

export function buildLandingJsonLdSchemas() {
  const origin = getSiteUrl();
  return [
    buildExplysOrganizationJsonLd(origin),
    buildExplysWebSiteJsonLd(origin),
  ];
}
