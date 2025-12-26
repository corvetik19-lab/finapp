"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const schema = z
  .object({
    password: z.string().min(8, "Минимум 8 символов").max(64, "Максимум 64 символа"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Пароли не совпадают", path: ["confirm"] });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSuspenseFallback />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

function ResetPasswordPageContent() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseClient();
        const hasCode = !!sp.get("code");
        if (hasCode) {
          await supabase.auth.exchangeCodeForSession(window.location.search);
        }
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch {
        // Ignore
      } finally {
        setReady(true);
      }
    };
    run();
  }, [sp]);

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
    <main className="min-h-screen grid place-items-center p-6 bg-gray-100">
      <Card className="w-full max-w-[420px] shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Сброс пароля</CardTitle>
          <CardDescription>Введите новый пароль для вашей учётной записи.</CardDescription>
        </CardHeader>
        <CardContent>
          {!ready && <p className="text-muted-foreground">Готовим форму…</p>}

          {ready && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Новый пароль</Label>
                <Input id="password" type="password" placeholder="Новый пароль" {...register("password")} />
                {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Подтверждение пароля</Label>
                <Input id="confirm" type="password" placeholder="Повторите пароль" {...register("confirm")} />
                {errors.confirm && <p className="text-sm text-red-600">{errors.confirm.message}</p>}
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Обновляем…" : "Обновить пароль"}
              </Button>
            </form>
          )}

          {success && <Alert className="mt-4 border-green-200 bg-green-50"><AlertDescription className="text-green-700">{success}</AlertDescription></Alert>}
          {error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert>}
        </CardContent>
      </Card>
    </main>
  );
}

function ResetPasswordSuspenseFallback() {
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gray-100">
      <Card className="w-full max-w-[420px] shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Сброс пароля</CardTitle>
          <CardDescription>Загружаем форму…</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Пожалуйста, подождите.</p>
        </CardContent>
      </Card>
    </main>
  );
}
