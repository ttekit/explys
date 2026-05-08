import { Briefcase, GraduationCap, User } from "lucide-react";
import { cn } from "../lib/utils";

export type RegistrationRoleChoice = "teacher" | "student" | "adult";

type RoleCopy = {
  title: string;
  description: string;
};

interface RegistrationRoleCardsProps {
  /** Current role from context; `'choose'` means none selected visually */
  value: string;
  onChange: (role: RegistrationRoleChoice) => void;
  /** Labels per role (i18n). */
  rolesCopy: Record<RegistrationRoleChoice, RoleCopy>;
}

const roleMeta: {
  id: RegistrationRoleChoice;
  Icon: typeof GraduationCap;
}[] = [
  { id: "teacher", Icon: GraduationCap },
  { id: "student", Icon: User },
  { id: "adult", Icon: Briefcase },
];

export function RegistrationRoleCards({
  value,
  onChange,
  rolesCopy,
}: RegistrationRoleCardsProps) {
  return (
    <div className="space-y-4">
      {roleMeta.map((role) => {
        const Icon = role.Icon;
        const copy = rolesCopy[role.id];
        const selected = value === role.id;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onChange(role.id)}
            className={cn(
              "group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all",
              selected
                ? "border-primary bg-primary/10"
                : "hover:border-primary hover:bg-primary/5",
            )}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <Icon className="size-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground">{copy.title}</h3>
              <p className="text-sm text-muted-foreground">{copy.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
