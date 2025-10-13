"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import type { Metadata } from "next";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h2>Что-то пошло не так!</h2>
          <button onClick={() => reset()}>Попробовать снова</button>
        </div>
      </body>
    </html>
  );
}
