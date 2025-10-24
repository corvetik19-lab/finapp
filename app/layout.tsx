 import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/500.css";
import "@fontsource/rubik/700.css";
import "@fontsource-variable/roboto/index.css";
import "@fontsource-variable/rubik/index.css";
import styles from "./layout.module.css";
import { ToastProvider } from "@/components/toast/ToastContext";
import ToastContainer from "@/components/toast/ToastContainer";

export const metadata: Metadata = {
  title: "FinApp — Финансовый Трекер",
  description: "Умный финансовый трекер с AI аналитикой, бюджетами и отчётами",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FinApp",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4F46E5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="light-theme">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body className={`antialiased ${styles.fonts}`}>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
