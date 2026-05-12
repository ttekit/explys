import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

export default function EmailConfirmedPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const token = searchParams.get("token");

  useEffect(() => {
    const confirmEmail = async () => {
      if (!token) {
        setStatus("error");
        return;
      }

      try {
        // ЗАМІНИ ЦЕЙ URL на свій реальний ендпоінт підтвердження
        const response = await fetch(
          `http://localhost:4200/api/auth/confirm-email?token=${token}`,
          {
            method: "GET",
          },
        );

        if (response.ok) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Помилка підтвердження:", error);
        setStatus("error");
      }
    };

    confirmEmail();
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f111a] text-white">
      <div className="text-center p-8 bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl max-w-md mx-auto">
        {status === "loading" && (
          <p className="text-gray-400">Підтверджуємо пошту...</p>
        )}

        {status === "success" && (
          <>
            <div className="bg-green-500/20 text-green-400 inline-flex size-16 items-center justify-center rounded-full text-3xl font-bold mb-6">
              ✓
            </div>
            <h1 className="text-3xl font-bold mb-4">Пошту підтверджено!</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Тепер ваш акаунт повністю активований.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="bg-red-500/20 text-red-400 inline-flex size-16 items-center justify-center rounded-full text-3xl font-bold mb-6">
              ✕
            </div>
            <h1 className="text-3xl font-bold mb-4">Помилка!</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Токен недійсний або термін його дії вичерпано.
            </p>
          </>
        )}

        <button
          onClick={() => (window.location.href = "/loginForm")}
          className="px-8 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold transition-colors w-full"
        >
          Перейти до входу
        </button>
      </div>
    </div>
  );
}
