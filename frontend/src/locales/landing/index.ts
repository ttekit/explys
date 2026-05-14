import { appEn } from "../app/en";
import { appUk } from "../app/uk";
import { landingEn } from "./en";
import { landingUk } from "./uk";

export type LandingLocaleId = "en" | "uk";

const bundledEn = { ...landingEn, ...appEn };
export type LandingMessages = typeof bundledEn;

/** Runtime check: Ukrainian marketing bundle matches English shape. */
const _landingShape: typeof landingEn = landingUk as unknown as typeof landingEn;
void _landingShape;

/** Runtime check: Ukrainian app bundle matches English shape. */
const _appShape: typeof appEn = appUk as unknown as typeof appEn;
void _appShape;

export const LANDING_LOCALES: Record<LandingLocaleId, LandingMessages> = {
  en: bundledEn,
  uk: { ...landingUk, ...appUk } as unknown as LandingMessages,
};

export { landingEn, landingUk, appEn, appUk };

/** @deprecated Use LandingMessages from merged bundles */
export type LandingLocale = LandingMessages;
