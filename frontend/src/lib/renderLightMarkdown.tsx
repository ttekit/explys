import { Fragment, type ReactNode } from "react";

/**
 * Renders `**bold**` segments as `<strong>`; other text unchanged.
 * Used for short learning-plan checklist lines that mirror backend copy.
 */
export function renderLightMarkdown(text: string): ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <span className="min-w-0 flex-1">
      {parts.map((chunk, i) =>
        i % 2 === 1 ?
          <strong key={i} className="font-semibold text-foreground">
            {chunk}
          </strong>
        : <Fragment key={i}>{chunk}</Fragment>,
      )}
    </span>
  );
}
