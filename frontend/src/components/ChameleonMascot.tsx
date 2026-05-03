import { cn } from "../lib/utils";

interface ChameleonMascotProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  mood?: "happy" | "thinking" | "excited" | "waving";
  animate?: boolean;
}

export function ChameleonMascot({
  className,
  size = "md",
  mood = "happy",
  animate = true,
}: ChameleonMascotProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
    xl: "w-48 h-48",
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        animate && "animate-bounce-slow",
        className,
      )}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full drop-shadow-lg"
      >
        <ellipse cx="100" cy="120" rx="55" ry="45" className="fill-accent" />
        <circle cx="75" cy="115" r="8" className="fill-accent/60" />
        <circle cx="95" cy="130" r="6" className="fill-accent/60" />
        <circle cx="120" cy="110" r="10" className="fill-accent/60" />
        <path
          d="M155 130 Q180 130 185 155 Q190 180 165 185 Q145 188 145 170"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
          className="stroke-accent"
        />
        <ellipse cx="130" cy="155" rx="12" ry="8" className="fill-accent" />
        <rect x="125" y="155" width="10" height="20" rx="5" className="fill-accent" />
        <ellipse cx="70" cy="155" rx="12" ry="8" className="fill-accent" />
        <rect x="65" y="155" width="10" height="20" rx="5" className="fill-accent" />
        <ellipse cx="65" cy="85" rx="40" ry="35" className="fill-accent" />
        <path
          d="M40 60 Q50 40 65 55 Q80 40 90 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-primary"
        />
        <circle cx="55" cy="80" r="18" className="fill-background" />
        <circle cx="55" cy="80" r="14" className="fill-foreground" />
        <circle cx="52" cy="77" r="5" className="fill-background" />
        {mood === "happy" && (
          <path
            d="M40 68 Q55 62 70 68"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="stroke-primary"
          />
        )}
        {mood === "thinking" && (
          <path
            d="M40 65 L70 70"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="stroke-primary"
          />
        )}
        {mood === "excited" && (
          <>
            <path
              d="M38 65 Q55 55 72 65"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="stroke-primary"
            />
            <circle cx="95" cy="50" r="3" className="fill-primary animate-pulse" />
            <circle cx="30" cy="55" r="2" className="fill-primary animate-pulse" />
          </>
        )}
        {mood === "waving" && (
          <path
            d="M42 66 Q55 60 68 66"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="stroke-primary"
          />
        )}
        <path
          d="M30 95 Q40 105 55 100"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          className="stroke-primary/70"
        />
        {mood === "excited" && (
          <path
            d="M32 98 Q20 110 25 120"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            className="stroke-destructive"
          />
        )}
        {mood === "waving" && (
          <g className="origin-[45px_145px] animate-wave">
            <ellipse cx="45" cy="145" rx="10" ry="7" className="fill-accent" />
            <rect x="35" y="120" width="10" height="25" rx="5" className="fill-accent" />
            <circle cx="40" cy="115" r="8" className="fill-accent" />
          </g>
        )}
      </svg>
    </div>
  );
}
