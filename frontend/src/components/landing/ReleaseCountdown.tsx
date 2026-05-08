import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { useLandingLocale } from "../../context/LandingLocaleContext";

/** Release moment: start of 22 May (local time). */
const RELEASE_AT = new Date(2026, 4, 22, 0, 0, 0);

function getRemainder(targetMs: number) {
  if (targetMs <= 0) {
    return {
      totalHours: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }
  const days = Math.floor(targetMs / 86_400_000);
  const hours = Math.floor((targetMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((targetMs % 3_600_000) / 60_000);
  const seconds = Math.floor((targetMs % 60_000) / 1000);
  const totalHours = Math.floor(targetMs / 3_600_000);
  return { totalHours, days, hours, minutes, seconds };
}

function useReleaseRemainder() {
  const [remainMs, setRemainMs] = useState(() =>
    Math.max(0, RELEASE_AT.getTime() - Date.now()),
  );

  useEffect(() => {
    const tick = () =>
      setRemainMs(Math.max(0, RELEASE_AT.getTime() - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return remainMs;
}

/** Full-width landing section: title + subtitle + countdown (matches FeaturesSection layout). */
export function ReleaseCountdownSection() {
  const { locale, messages } = useLandingLocale();
  const rc = messages.releaseCountdown;
  const remainMs = useReleaseRemainder();
  const { totalHours, days, hours, minutes, seconds } =
    getRemainder(remainMs);
  const isLive = remainMs === 0;

  const unitRows = [
    { label: rc.units.days, value: days, pad: false },
    { label: rc.units.hours, value: hours, pad: true },
    { label: rc.units.minutes, value: minutes, pad: true },
    { label: rc.units.seconds, value: seconds, pad: true },
  ];

  return (
    <section
      id="release-countdown"
      className="relative scroll-mt-24 border-b border-border py-24 font-display"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.65_0.25_295/0.12)_0%,transparent_55%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16">
          <h2 className="mb-4 text-balance font-display text-3xl font-bold sm:text-4xl">
            <span className="text-primary">{rc.titleAccent}</span>
            {rc.titleRest}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {rc.subtitleBefore}{" "}
            <span className="text-foreground/90">{rc.subtitleDate}</span>
            {rc.subtitleAfter}
          </p>
        </div>

        <div
          className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5 sm:p-8"
          aria-live="polite"
        >
          <div className="mb-6 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
            <div className="flex items-center gap-2 text-accent">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Timer className="h-6 w-6" aria-hidden />
              </div>
              <div className="text-left sm:text-center">
                <p className="font-display text-base font-semibold text-accent sm:text-lg">
                  {isLive ? rc.statusLive : rc.statusWaiting}
                </p>
                {!isLive ?
                  <p className="text-sm text-muted-foreground">
                    {totalHours.toLocaleString(
                      locale === "uk" ? "uk-UA" : "en-US",
                    )}{" "}
                    {rc.hoursRemaining}
                  </p>
                : <p className="text-sm text-muted-foreground">
                    {rc.thanksLive}
                  </p>
                }
              </div>
            </div>
          </div>

          {isLive ?
            null
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {unitRows.map((unit) => (
                <div
                  key={unit.label}
                  className="rounded-xl border border-border bg-background/80 px-3 py-4 text-center transition-colors hover:border-primary/30 sm:py-5"
                >
                  <p className="font-display text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                    {unit.pad ?
                      String(unit.value).padStart(2, "0")
                    : String(unit.value)}
                  </p>
                  <p className="mt-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    {unit.label}
                  </p>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </section>
  );
}
