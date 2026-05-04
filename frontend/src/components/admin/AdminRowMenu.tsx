import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MoreVertical } from "lucide-react";
import { AdminButton } from "./adminUi";

const RowMenuCloseContext = createContext<(() => void) | null>(null);

export function useCloseRowMenu() {
  return useContext(RowMenuCloseContext);
}

export function AdminRowMenu({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <RowMenuCloseContext.Provider value={close}>
      <div className="relative" ref={ref}>
        <AdminButton
          variant="ghost"
          size="icon"
          aria-label="Row actions"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </AdminButton>
        {open ? (
          <div
            className="absolute right-0 z-50 mt-1 min-w-[168px] rounded-lg border border-border bg-card py-1 shadow-lg ring-1 ring-border/60"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="menu"
          >
            {children}
          </div>
        ) : null}
      </div>
    </RowMenuCloseContext.Provider>
  );
}

export function AdminRowMenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void | Promise<void>;
  danger?: boolean;
}) {
  const closeParent = useCloseRowMenu();

  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted"}`}
      onClick={() => {
        void Promise.resolve(onClick?.()).finally(() => closeParent?.());
      }}
    >
      {children}
    </button>
  );
}
