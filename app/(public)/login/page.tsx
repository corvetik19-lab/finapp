"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSupabaseClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSent(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (error) throw error;
      setSent("Мы отправили вам письмо для входа. Проверьте почту.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось отправить письмо. Попробуйте ещё раз.";
      setError(msg);
    }
  };

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 24 }}>
      <div style={{ width: 360, maxWidth: "100%", background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 6px 24px rgba(0,0,0,0.07)" }}>
        <h1 style={{ margin: "0 0 12px" }}>Вход</h1>
        <p style={{ margin: "0 0 20px", color: "#555" }}>Укажите email — мы пришлём магическую ссылку.</p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label style={{ display: "block", marginBottom: 8 }}>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
          />
          {errors.email && (
            <div style={{ color: "#c62828", marginTop: 6 }}>{errors.email.message}</div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ marginTop: 16, width: "100%", padding: "10px 12px", borderRadius: 8, border: 0, background: "#1565c0", color: "#fff", cursor: "pointer" }}
          >
            {isSubmitting ? "Отправляем..." : "Отправить ссылку для входа"}
          </button>
        </form>
        <button
          type="button"
          onClick={async () => {
            setError(null);
            try {
              const supabase = getSupabaseClient();
              const { error } = await supabase.auth.signInAnonymously();
              if (error) throw error;
              window.location.href = "/dashboard";
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Не удалось выполнить гостевой вход.";
              setError(msg);
            }
          }}
          style={{ marginTop: 12, width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fafafa", cursor: "pointer" }}
        >
          Войти как гость (временно)
        </button>
        {sent && <div style={{ color: "#2e7d32", marginTop: 12 }}>{sent}</div>}
        {error && <div style={{ color: "#c62828", marginTop: 12 }}>{error}</div>}
      </div>
    </main>
  );
}
