import { useState, useEffect } from "react";
import { useLandingLocale } from "../../context/LandingLocaleContext";

type PublicStatsDto = {
  videos: number;
};

export default function HeroStats() {
  const { messages } = useLandingLocale();
  const { hero } = messages;
  const [stats, setStats] = useState<PublicStatsDto | null>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "https://api.explys.com";
    fetch(`${apiUrl}/users/public/stats`)
      .then((res) => res.json())
      .then((data: { videos?: number }) =>
        setStats(typeof data.videos === "number" ? { videos: data.videos } : null),
      )
      .catch(console.error);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-wrap justify-center gap-x-6 gap-y-3 rounded-[15px] px-2 py-3 text-center text-foreground/75 sm:mx-0 sm:max-w-none sm:flex-nowrap sm:justify-start sm:gap-20 sm:px-6 sm:text-lg">
      <div className="flex min-w-[5.5rem] flex-col items-center">
        <p className="text-xl font-bold text-primary sm:text-2xl">
          {stats ? `${stats.videos}+` : "500+"}
        </p>
        <p className="-mt-1 text-xs sm:text-md">{hero.videos}</p>
      </div>
      <div className="flex min-w-[5.5rem] flex-col items-center">
        <p className="text-xl font-bold text-primary sm:text-2xl">10,000+</p>
        <p className="-mt-1 text-xs sm:text-md">{hero.hours}</p>
      </div>
    </div>
  );
}
