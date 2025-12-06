"use client";

import { useState } from "react";
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

const credentialsSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(8, "Минимум 8 символов").max(64, "Максимум 64 символа"),
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
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (signInError) throw signInError;
      if (!session) throw new Error("Не удалось создать сессию. Попробуйте ещё раз.");
      window.location.href = "/dashboard";
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка авторизации";
      setError(msg);
    }
  });

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gray-100">
      <Card className="w-full max-w-[420px] shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Вход</CardTitle>
          <CardDescription>Используйте email и пароль для доступа к приложению.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="user@example.com" {...register("email")} autoFocus />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" placeholder="Введите пароль" {...register("password")} />
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Обрабатываем…" : "Войти"}
            </Button>
          </form>

          {success && <Alert className="mt-4 border-green-200 bg-green-50"><AlertDescription className="text-green-700">{success}</AlertDescription></Alert>}
          {error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert>}
        </CardContent>
      </Card>
    </main>
  );
}
