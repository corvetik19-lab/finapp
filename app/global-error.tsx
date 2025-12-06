"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 text-center bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Что-то пошло не так!</h2>
          <p className="text-gray-600 mb-6">Произошла непредвиденная ошибка</p>
          <Button onClick={() => reset()}>
            Попробовать снова
          </Button>
        </div>
      </body>
    </html>
  );
}
