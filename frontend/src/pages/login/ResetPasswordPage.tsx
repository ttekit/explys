import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import Button from "../../components/Button";
import InputText from "../../components/InputText";
import LabelRegister from "../../components/LabelRegister";
import { apiFetch } from "../../lib/api";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error("Введіть новий пароль");
      return;
    }

    if (password.length < 8) {
      toast.error("Пароль має бути не менше 8 символів");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast.error("Пароль повинен містити хоча б одну велику літеру");
      return;
    }

    if (!/[a-z]/.test(password)) {
      toast.error("Пароль повинен містити хоча б одну маленьку літеру");
      return;
    }

    if (!/\d/.test(password)) {
      toast.error("Пароль повинен містити хоча б одну цифру");
      return;
    }

    if (!/[@$!%*?&]/.test(password)) {
      toast.error(
        "Пароль повинен містити спеціальний символ (@, $, !, %, *, ?, &)",
      );
      return;
    }

    if (!passwordRepeat) {
      toast.error("Підтвердіть новий пароль");
      return;
    }

    if (password !== passwordRepeat) {
      toast.error("Паролі не збігаються!");
      return;
    }

    if (!token) {
      toast.error("Відсутній токен відновлення");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch(`/auth/password-recovery/new/${token}`, {
        method: "POST",
        body: JSON.stringify({
          password: password,
          passwordRepeat: passwordRepeat,
        }),
      });

      if (response.ok) {
        toast.success("Пароль успішно змінено!");
        navigate("/loginForm");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Помилка при зміні пароля");
      }
    } catch (error) {
      toast.error("Сервер не відповідає. Спробуйте пізніше.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      rightTitle="Новий пароль"
      rightSubtitle="Створіть надійний пароль для вашого акаунту"
    >
      <div className="flex flex-col w-full">
        <h1 className="font-display text-2xl font-bold mb-6">
          Встановіть новий пароль
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Блок першого пароля */}
          <div className="space-y-2">
            <LabelRegister isRequired={true}>Новий пароль</LabelRegister>
            <div className="relative">
              <InputText
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Блок повторення пароля — виносимо окремо! */}
          <div className="space-y-2">
            <LabelRegister isRequired={true}>Підтвердіть пароль</LabelRegister>
            <InputText // Використовуй той самий компонент InputText для однакового стилю
              type={showPassword ? "text" : "password"}
              value={passwordRepeat}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPasswordRepeat(e.target.value)
              }
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)]"
          >
            {isSubmitting ? "Оновлення..." : "Змінити пароль"}
          </Button>
        </form>
      </div>
    </AuthSplitLayout>
  );
}
