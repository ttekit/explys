import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router";
import toast from "react-hot-toast";

import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import Button from "../../components/Button";
import ValidateError from "../../components/ValidateError";

export default function EmailConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "you@example.com";

  const [isChecking, setIsChecking] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const checkStatus = async () => {
    try {
      navigate("/loginForm", {
        state: {
          message: "Пошту успішно підтверджено! Тепер ви можете увійти.",
        },
      });
      return true;
    } catch (error) {
      console.error("Помилка:", error);
      return false;
    }
  };
  // const checkStatus = async () => {
  //   try {
  //     const token = localStorage.getItem("accessToken");
  //     const response = await fetch("http://localhost:4200/auth/profile", {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     if (!response.ok) return false;

  //     const data = await response.json();
  //     if (data.isVerified) {
  //       navigate("/registrationDetails");
  //       return true;
  //     }
  //     return false;
  //   } catch (error) {
  //     console.error("Помилка:", error);
  //     return false;
  //   }
  // };

  const handleContinue = async () => {
    setIsChecking(true);
    setShowError(false);
    const isConfirmed = await checkStatus();
    if (!isConfirmed) {
      setShowError(true);
    } else {
      toast.success("Пошту підтверджено!");
    }
    setIsChecking(false);
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);

    try {
      const response = await fetch(
        "http://localhost:4200/auth/resend-confirmation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Лист успішно надіслано повторно!");
      } else {
        toast.error(result.message || "Не вдалося надіслати лист.");
      }
    } catch (e) {
      toast.error("Не вдалося надіслати лист. Перевірте з'єднання.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthSplitLayout
      rightTitle="Готові продовжити?"
      rightSubtitle="Поверніться до свого персонального навчального шляху саме з того місця, де зупинилися."
    >
      <div className="flex flex-col justify-center h-full text-foreground">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-2xl">🦎</span>
          <span className="font-bold text-lg">З поверненням</span>
        </div>

        <h1 className="text-3xl font-bold font-display mb-3">
          Перевірте пошту
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Ми надіслали лист для підтвердження на <br />
          <strong className="text-foreground font-medium">{email}</strong>
        </p>

        {showError && (
          <div className="mb-6 animate-pulse">
            <ValidateError>
              Ви ще не підтвердили пошту. Будь ласка, перевірте вхідні
              повідомлення або папку "Спам" та перейдіть за посиланням.
            </ValidateError>
          </div>
        )}

        <Button
          onClick={handleContinue}
          disabled={isChecking}
          className="w-full py-6 text-base font-semibold"
        >
          {isChecking ? "Перевірка..." : "Продовжити"}
        </Button>

        <div className="mt-8 flex flex-col items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Не отримали лист?{" "}
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-primary hover:underline font-medium bg-transparent border-none cursor-pointer disabled:opacity-50"
            >
              {isResending ? "Відправка..." : "Надіслати ще раз"}
            </button>
          </span>
          <Link
            to="/loginForm"
            className="text-muted-foreground hover:text-foreground transition-colors self-start flex items-center gap-2 mt-4"
          >
            ← Повернутися до входу
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
