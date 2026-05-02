import { useLocation, useNavigate, Link } from "react-router";
import Button from "../../components/Button";
import { downloadStudentAccountsExcel } from "../../lib/studentAccountsExcel";
import type { GeneratedStudentAccount } from "../../lib/registerUser";

type SuccessLocationState = {
  generatedStudents?: GeneratedStudentAccount[];
};

export default function RegisterSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SuccessLocationState | null;
  const students = state?.generatedStudents ?? [];
  const hasStudents = students.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-[40px] bg-(--gray-background) p-8 shadow-[0_20px_20px_rgba(0,0,0,0.1)]">
        <div className="mb-2 text-4xl" aria-hidden>
          ✓
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Registration successful
        </h1>
        <p className="mt-2 text-gray-600">
          {hasStudents
            ? "Your teacher account is ready. Student logins were created for the pupils you listed. Download the Excel file to share credentials securely (store it in a safe place—anyone with the file can sign in as those students)."
            : "Your account is ready. You can sign in with the email and password you chose."}
        </p>

        {hasStudents && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-gray-800">
              Student accounts ({students.length})
            </p>
            <div className="max-h-48 overflow-auto rounded-2xl border border-gray-200 bg-white/80 text-sm">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.email}
                      className="border-t border-gray-100 text-gray-800"
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
              onClick={() => void downloadStudentAccountsExcel(students, "student-accounts")}
            >
              Download student accounts (Excel)
            </Button>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2">
          <Button type="button" onClick={() => navigate("/loginForm")}>
            Go to sign in
          </Button>
          <Link to="/video-page" className="w-full text-center text-sm text-(--purple-default) font-semibold hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
