"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSupabaseClient } from "@/lib/supabase/client";

const credentialsSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .max(64, "Максимум 64 символа"),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsFormValues>({ resolver: zodResolver(credentialsSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);
    try {
      const supabase = getSupabaseClient();
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
          <h1>Вход</h1>
          <p>Используйте email и пароль для доступа к приложению.</p>
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
            {isSubmitting ? "Обрабатываем…" : "Войти"}
          </button>
        </form>

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
