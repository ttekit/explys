import { Helmet } from "react-helmet-async";
import { resolveCanonicalUrl } from "../../lib/siteUrl";

export type SEOProps = {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  noindex?: boolean;
  /** Defaults to `website`. */
  ogType?: string;
  /**
   * When true (default), document title is `{title} | Explys`.
   * When false, `title` is used as the full `<title>` (e.g. landing page).
   */
  useTitleSuffix?: boolean;
  /** Open Graph site name (default: Explys). */
  ogSiteName?: string;
  /** e.g. en_US, uk_UA — improves social previews. */
  ogLocale?: string;
  /** Second locale hint (e.g. uk_UA when primary is en_US). */
  ogLocaleAlternate?: string;
  /** Twitter card style (default summary_large_image). */
  twitterCard?: "summary" | "summary_large_image";
  /** Optional @site handle for Twitter. */
  twitterSite?: string;
  /** PWA / browser chrome (optional). */
  themeColor?: string;
  /**
   * JSON-LD objects (Organization, WebSite, etc.). Serialized as
   * `application/ld+json` script tags.
   */
  jsonLd?: Record<string, unknown>[];
};

const DEFAULT_OG_TYPE = "website";
const DEFAULT_SITE_NAME = "Explys";
const DEFAULT_THEME = "#813dec";

export function SEO({
  title,
  description,
  canonicalUrl,
  ogImage,
  noindex = false,
  ogType = DEFAULT_OG_TYPE,
  useTitleSuffix = true,
  ogSiteName = DEFAULT_SITE_NAME,
  ogLocale,
  ogLocaleAlternate,
  twitterCard = "summary_large_image",
  twitterSite,
  themeColor = DEFAULT_THEME,
  jsonLd,
}: SEOProps) {
  const absoluteUrl = resolveCanonicalUrl(canonicalUrl);
  const absoluteOgImage = ogImage
    ? resolveCanonicalUrl(ogImage)
    : resolveCanonicalUrl("/Icon.svg");

  const documentTitle = useTitleSuffix ? `${title} | Explys` : title;

  return (
    <Helmet>
      <title>{documentTitle}</title>
      <meta name="description" content={description} />
      {!noindex ?
        <meta name="robots" content="index, follow, max-image-preview:large" />
      : <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={absoluteUrl} />

      <meta name="theme-color" content={themeColor} />
      <meta name="application-name" content={ogSiteName} />

      <meta property="og:title" content={documentTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteOgImage} />
      <meta property="og:image:alt" content={documentTitle} />
      <meta property="og:url" content={absoluteUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={ogSiteName} />
      {ogLocale ?
        <meta property="og:locale" content={ogLocale} />
      : null}
      {ogLocaleAlternate ?
        <meta
          property="og:locale:alternate"
          content={ogLocaleAlternate}
        />
      : null}

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={documentTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteOgImage} />
      {twitterSite ?
        <meta name="twitter:site" content={twitterSite} />
      : null}

      {jsonLd?.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON-LD must not be HTML-escaped as text children in all runtimes.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Helmet>
  );
}
