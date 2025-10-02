"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSupabaseClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "Минимум 8 символов").max(64, "Максимум 64 символа"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Пароли не совпадают", path: ["confirm"] });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const sp = useSearchParams();

  // Try to exchange a code (OAuth-style) if present to obtain a session
  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseClient();
        const hasCode = !!sp.get("code");
        if (hasCode) {
          await supabase.auth.exchangeCodeForSession(window.location.search);
        }
        // If link came with hash (#access_token=...&type=recovery), supabase-js will initialize the session internally on first call.
        // Probe current session
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // Wait a tick and retry (hash parsing is async)
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch (e) {
        // Ignore; user can still see the form, updateUser will fail if нет сессии
      } finally {
        setReady(true);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Ссылка устарела или сессия не создана. Повторите сброс пароля из формы входа.");
      }
      const { error: updErr } = await supabase.auth.updateUser({ password: values.password });
      if (updErr) throw updErr;
      setSuccess("Пароль успешно обновлён. Сейчас перенаправим на вход…");
      reset({ password: "", confirm: "" });
      setTimeout(() => router.replace("/login"), 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось обновить пароль";
      setError(msg);
    }
  });

  return (
    <main className="login-layout">
      <div className="login-card">
        <div className="login-header">
          <h1>Сброс пароля</h1>
          <p>Введите новый пароль для вашей учётной записи.</p>
        </div>

        {!ready && <div>Готовим форму…</div>}

        {ready && (
          <form onSubmit={onSubmit} className="login-form">
            <label>
              Новый пароль
              <input type="password" placeholder="Новый пароль" {...register("password")} />
            </label>
            {errors.password && <div className="login-error">{errors.password.message}</div>}

            <label>
              Подтверждение пароля
              <input type="password" placeholder="Повторите пароль" {...register("confirm")} />
            </label>
            {errors.confirm && <div className="login-error">{errors.confirm.message}</div>}

            <button type="submit" disabled={isSubmitting} className="login-submit">
              {isSubmitting ? "Обновляем…" : "Обновить пароль"}
            </button>
          </form>
        )}

        {success && <div className="login-success">{success}</div>}
        {error && <div className="login-error">{error}</div>}
      </div>
      <style jsx>{`
        .login-layout { display: grid; place-items: center; min-height: 100dvh; padding: 24px; background: #f3f4f6; }
        .login-card { width: min(420px, 100%); background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 20px 40px rgba(15,23,42,.12); display: flex; flex-direction: column; gap: 18px; }
        .login-header h1 { margin: 0 0 8px; font-size: 26px; font-weight: 600; color: #0f172a; }
        .login-header p { margin: 0; color: #475569; font-size: 14px; }
        .login-form { display: flex; flex-direction: column; gap: 14px; }
        .login-form label { display: grid; gap: 6px; font-size: 14px; color: #0f172a; }
        .login-form input { border-radius: 10px; border: 1px solid #d0d8e3; padding: 10px 12px; font-size: 14px; }
        .login-form input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.18); }
        .login-submit { margin-top: 4px; background: linear-gradient(135deg,#2563eb,#1d4ed8); border: 0; color: #fff; padding: 12px 16px; border-radius: 12px; cursor: pointer; font-weight: 600; }
        .login-submit:disabled { opacity: .6; cursor: not-allowed; }
        .login-error { color: #c62828; font-size: 13px; }
        .login-success { color: #2e7d32; font-size: 13px; }
      `}</style>
    </main>
  );
}
