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
  title: "Finapp — учёт финансов",
  description: "Личный финансовый трекер: транзакции, бюджеты, отчёты и планы",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body className={styles.fonts}>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
