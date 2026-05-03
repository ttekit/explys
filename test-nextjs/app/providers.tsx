"use client";

import { Toaster } from "react-hot-toast";
import { RegistrationProvider } from "@/context/RegistrationContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <RegistrationProvider>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          className: "bg-zinc-900 text-zinc-100 border border-zinc-700",
          style: { boxShadow: "0 8px 30px rgba(0,0,0,0.4)" },
        }}
      />
    </RegistrationProvider>
  );
}
