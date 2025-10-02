"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";

const credentialsSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .max(64, "Максимум 64 символа"),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

type Mode = "sign_in" | "sign_up";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("sign_in");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<CredentialsFormValues>({ resolver: zodResolver(credentialsSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);
    try {
      const supabase = getSupabaseClient();
      if (mode === "sign_up") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });
        if (signUpError) throw signUpError;
        setSuccess("Учётная запись создана. Авторизуйтесь с указанным паролем.");
        setMode("sign_in");
        return;
      }

      const {
        data: { session },
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (signInError) throw signInError;
      if (!session) {
        throw new Error("Не удалось создать сессию. Попробуйте ещё раз.");
      }
      window.location.href = "/dashboard";
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка авторизации";
      setError(msg);
    }
  });

  return (
    <main className="login-layout">
      <div className="login-card">
        <div className="login-header">
          <h1>{mode === "sign_in" ? "Вход" : "Регистрация"}</h1>
          <p>Используйте email и пароль для доступа к приложению.</p>
        </div>

        <div className="login-toggle">
          <button
            type="button"
            className={mode === "sign_in" ? "active" : ""}
            onClick={() => {
              setMode("sign_in");
              setError(null);
              setSuccess(null);
            }}
          >
            Вход
          </button>
          <button
            type="button"
            className={mode === "sign_up" ? "active" : ""}
            onClick={() => {
              setMode("sign_up");
              setError(null);
              setSuccess(null);
            }}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          <label>
            Email
            <input type="email" placeholder="user@example.com" {...register("email")} autoFocus />
          </label>
          {errors.email && <div className="login-error">{errors.email.message}</div>}

          <label>
            Пароль
            <input type="password" placeholder="Введите пароль" {...register("password")} />
          </label>
          {errors.password && <div className="login-error">{errors.password.message}</div>}

          <button type="submit" disabled={isSubmitting} className="login-submit">
            {isSubmitting ? "Обрабатываем…" : mode === "sign_in" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        {mode === "sign_in" && (
          <div className="login-forgot">
            <button
              type="button"
              className="forgot-btn"
              onClick={async () => {
                setError(null);
                setSuccess(null);
                try {
                  const { email } = getValues();
                  const parsed = credentialsSchema.pick({ email: true }).safeParse({ email });
                  if (!parsed.success) {
                    setError("Укажите корректный email в поле выше и нажмите снова");
                    return;
                  }
                  const supabase = getSupabaseClient();
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const { error: resetErr } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
                    redirectTo: `${origin}/reset-password`,
                  });
                  if (resetErr) throw resetErr;
                  setSuccess("Ссылка для сброса пароля отправлена. Проверьте почту.");
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Не удалось отправить письмо для сброса пароля";
                  setError(msg);
                }
              }}
            >
              Забыли пароль?
            </button>
          </div>
        )}

        <div className="login-footer">
          <Link href="/privacy">Политика конфиденциальности</Link>
          <span>•</span>
          <Link href="/terms">Условия использования</Link>
        </div>

        {success && <div className="login-success">{success}</div>}
        {error && <div className="login-error">{error}</div>}
      </div>
      <style jsx>{`
        .login-layout {
          display: grid;
          place-items: center;
          min-height: 100dvh;
          padding: 24px;
          background: #f3f4f6;
        }
        .login-card {
          width: min(420px, 100%);
          background: #fff;
          padding: 32px;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .login-header h1 {
          margin: 0 0 8px;
          font-size: 26px;
          font-weight: 600;
          color: #0f172a;
        }
        .login-header p {
          margin: 0;
          color: #475569;
          font-size: 14px;
        }
        .login-toggle {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          background: #f8fafc;
          padding: 6px;
          border-radius: 12px;
        }
        .login-toggle button {
          border: 0;
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          background: transparent;
          font-weight: 600;
          color: #64748b;
        }
        .login-toggle button.active {
          background: #2563eb;
          color: #fff;
          box-shadow: 0 10px 18px rgba(37, 99, 235, 0.24);
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .login-form label {
          display: grid;
          gap: 6px;
          font-size: 14px;
          color: #0f172a;
        }
        .login-form input {
          border-radius: 10px;
          border: 1px solid #d0d8e3;
          padding: 10px 12px;
          font-size: 14px;
        }
        .login-form input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
        }
        .login-submit {
          margin-top: 4px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border: 0;
          color: #fff;
          padding: 12px 16px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
        }
        .login-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-forgot { margin-top: 8px; display: flex; justify-content: flex-end; }
        .forgot-btn { background: transparent; border: 0; color: #2563eb; cursor: pointer; font-size: 13px; }
        .forgot-btn:hover { text-decoration: underline; }
        .login-footer {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #94a3b8;
        }
        .login-footer a {
          color: #2563eb;
        }
        .login-error {
          color: #c62828;
          font-size: 13px;
        }
        .login-success {
          color: #2e7d32;
          font-size: 13px;
        }
      `}</style>
    </main>
  );
}
