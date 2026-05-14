import { useState, FormEvent } from "react";
import { Link } from "react-router";
import { AuthSplitLayout } from "../../components/AuthSplitLayout"; // Перевір шлях до файлу
import Button from "../../components/Button"; // Перевір шлях
import InputText from "../../components/InputText"; // Перевір шлях
import LabelRegister from "../../components/LabelRegister"; // Перевір шлях
import { apiFetch } from "../../lib/api";
import toast from "react-hot-toast";
import { useLandingLocale } from "../../context/LandingLocaleContext";

export default function ForgotPasswordPage() {
  const { messages } = useLandingLocale();
  const t = messages.auth.login;
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {   
      const response = await apiFetch("/auth/password-recovery/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || "Сталася помилка. Спробуйте пізніше.");
      }
    } catch (error) {
      toast.error("Помилка з'єднання з сервером.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      rightTitle="Відновлення доступу"
      rightSubtitle="Ми допоможемо вам повернутися до навчання"
      progressStep={1}
      progressTotal={2}
    >
      <div className="flex flex-col w-full">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold mb-2">
            Забули пароль?
          </h1>
          <p className="text-muted-foreground text-sm">
            {!isSuccess
              ? "Введіть email, пов'язаний з вашим акаунтом, і ми надішлемо вам посилання для скидання пароля."
              : "Перевірте вашу пошту!"}
          </p>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <LabelRegister isRequired={true}>Електронна пошта</LabelRegister>
              <InputText
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder={t.placeholderEmail}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
            >
              {isSubmitting ? "Відправка..." : "Відправити посилання"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center text-center p-6 bg-green-500/10 rounded-2xl border border-green-500/20">
            <span className="text-4xl mb-3">📧</span>
            <p className="text-foreground font-medium mb-1">
              Лист успішно відправлено!
            </p>
            <p className="text-sm text-muted-foreground">
              Ми надіслали інструкції на адресу: <br />
              <strong className="text-white">{email}</strong>
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/loginForm"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Повернутися до входу
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
