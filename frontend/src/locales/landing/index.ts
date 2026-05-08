import { landingEn } from "./en";
import { landingUk } from "./uk";

export type LandingLocaleId = "en" | "uk";

export type LandingMessages = typeof landingEn;

/** Runtime check: Ukrainian bundle matches English shape. */
const _bundleShape: LandingMessages = landingUk as unknown as LandingMessages;
void _bundleShape;

export const LANDING_LOCALES: Record<LandingLocaleId, LandingMessages> = {
  en: landingEn,
  uk: landingUk as LandingMessages,
};

export { landingEn, landingUk };

/** @deprecated Use LandingMessages from en/uk */
export type LandingLocale = LandingMessages;
