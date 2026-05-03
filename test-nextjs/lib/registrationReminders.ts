import { downloadTextFile } from "./teacher-roster-csv";

/** Plain-text reminder: safe to keep (no password). */
export function downloadSignInReminderFile(name: string, email: string) {
  const text = [
    "Registration successful",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    "Sign in using the password you created during registration.",
    "Store this file securely if you keep it on disk.",
  ].join("\r\n");
  downloadTextFile(
    "registration-sign-in-reminder.txt",
    text,
    "text/plain;charset=utf-8",
  );
}
