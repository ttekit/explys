import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export function AdminCard({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card", className)}
      {...p}
    />
  );
}

export function AdminCardHeader({
  className,
  ...p
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...p} />;
}

export function AdminCardTitle({
  className,
  ...p
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-lg leading-none font-semibold", className)}
      {...p}
    />
  );
}

export function AdminCardDescription({
  className,
  ...p
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...p} />
  );
}

export function AdminCardContent({
  className,
  ...p
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...p} />;
}

type BadgeVariant = "default" | "secondary" | "outline" | "accent" | "danger";

const badgeStyles: Record<BadgeVariant, string> = {
  default: "bg-primary/20 text-primary",
  secondary: "bg-muted text-muted-foreground",
  outline: "border border-border bg-transparent text-foreground",
  accent: "bg-accent/20 text-accent",
  danger: "bg-destructive/15 text-destructive",
};

export function AdminBadge({
  className,
  variant = "secondary",
  ...p
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        badgeStyles[variant],
        className,
      )}
      {...p}
    />
  );
}

type BtnVariant = "primary" | "outline" | "ghost" | "danger";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

const btnVariant: Record<BtnVariant, string> = {
  primary: "bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90",
  outline:
    "border border-border bg-transparent px-4 py-2.5 text-foreground hover:bg-muted",
  ghost: "rounded-lg px-2 py-2 text-foreground hover:bg-muted",
  danger:
    "bg-destructive px-4 py-2.5 text-destructive-foreground hover:bg-destructive/90",
};

export function AdminButton({
  className,
  variant = "primary",
  size = "default",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "default" | "sm" | "icon";
}) {
  const sizeCls =
    size === "icon"
      ? "size-8 p-0 shrink-0"
      : size === "sm"
        ? "px-3 py-1.5 text-xs"
        : "";
  return (
    <button
      type="button"
      className={cn(btnBase, btnVariant[variant], sizeCls, className)}
      {...p}
    />
  );
}

export function AdminInput({
  className,
  ...p
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border-0 bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
        className,
      )}
      {...p}
    />
  );
}

export function AdminTextarea({
  className,
  ...p
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
        className,
      )}
      {...p}
    />
  );
}

export function AdminSelectNative({
  className,
  children,
  ...p
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
        className,
      )}
      {...p}
    >
      {children}
    </select>
  );
}

export function AdminProgress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function AdminModal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-modal
        aria-labelledby="admin-modal-title"
      >
        <div className="flex items-center justify-between border-border border-b px-6 py-4">
          <h2 id="admin-modal-title" className="font-display text-lg font-semibold">
            {title}
          </h2>
          <AdminButton variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            ×
          </AdminButton>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-3 border-border border-t px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function AdminTabs({
  value,
  onChange,
  tabs,
}: {
  value: string;
  onChange: (v: string) => void;
  tabs: { id: string; label: ReactNode }[];
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-xl bg-muted/50 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            value === t.id
              ? "bg-card text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
