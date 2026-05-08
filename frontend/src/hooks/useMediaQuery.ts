import { useEffect, useState } from "react";

const LG_MIN_WIDTH = 1024;

/** Matches Tailwind `lg` breakpoint — single layout branch so we do not mount duplicate tab panels (e.g. two quizzes). */
export function useIsLgUp(): boolean {
  const [lg, setLg] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= LG_MIN_WIDTH : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${LG_MIN_WIDTH}px)`);
    const sync = () => setLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return lg;
}
