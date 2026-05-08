import { useLocation, useNavigate, Link } from "react-router";
import Button from "../../components/Button";
import { downloadStudentAccountsExcel } from "../../lib/studentAccountsExcel";
import type { GeneratedStudentAccount } from "../../lib/registerUser";
import { ChameleonMascot } from "../../components/ChameleonMascot";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { LandingLanguageToggle } from "../../components/landing/LandingLanguageToggle";

type SuccessLocationState = {
  generatedStudents?: GeneratedStudentAccount[];
};

export default function RegisterSuccessPage() {
  const { messages, locale } = useLandingLocale();
  const t = messages.auth.registration.success;
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SuccessLocationState | null;
  const students = state?.generatedStudents ?? [];
  const hasStudents = students.length > 0;

  return (
    <div
      className="bg-background flex min-h-screen flex-col gap-12 p-8 text-foreground lg:flex-row lg:items-center lg:justify-center lg:gap-16"
      lang={locale === "uk" ? "uk" : "en"}
    >
      <div className="fixed top-4 right-4 z-50 md:top-5 md:right-5">
        <LandingLanguageToggle />
      </div>

      <div className="mx-auto hidden w-full max-w-sm flex-col items-center text-center lg:flex">
        <ChameleonMascot size="lg" mood="excited" className="mb-6" />
        <h2 className="font-display text-2xl font-bold">{t.mascotTitle}</h2>
        <p className="mt-3 text-muted-foreground">{t.mascotSubtitle}</p>
      </div>

      <div className="border-border bg-card text-card-foreground mx-auto w-full max-w-lg rounded-3xl border p-8 shadow-2xl">
        <div
          className="bg-primary/20 text-primary mb-4 inline-flex size-14 items-center justify-center rounded-full text-2xl font-bold"
          aria-hidden
        >
          ✓
        </div>
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          {hasStudents ? t.withStudents : t.solo}
        </p>

        {hasStudents && (
          <div className="mt-6">
            <p className="text-foreground mb-3 text-sm font-semibold">
              {t.studentAccounts.replace("COUNT", String(students.length))}
            </p>
            <div className="border-border bg-muted/60 max-h-48 overflow-auto rounded-xl border text-sm">
              <table className="w-full text-left">
                <thead className="bg-muted sticky top-0 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t.colName}</th>
                    <th className="px-3 py-2 font-medium">{t.colEmail}</th>
                    <th className="px-3 py-2 font-medium">{t.colPassword}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.email}
                      className="border-border border-t text-foreground"
                    >
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2 break-all">{s.email}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {s.password}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              className="!mt-6"
              onClick={() =>
                void downloadStudentAccountsExcel(
                  students,
                  "student-accounts",
                )
              }
            >
              {t.downloadExcel}
            </Button>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2">
          <Button
            type="button"
            className="py-6 text-base font-semibold"
            onClick={() => navigate("/loginForm")}
          >
            {t.goSignIn}
          </Button>
          <Link
            to="/catalog"
            className="hover:text-primary/90 mt-2 w-full text-center text-sm font-semibold text-primary hover:underline"
          >
            {t.goCatalog}
          </Link>
        </div>
      </div>
    </div>
  );
}
