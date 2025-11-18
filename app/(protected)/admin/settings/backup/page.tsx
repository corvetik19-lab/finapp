import { Metadata } from "next";
import BackupClient from "./BackupClient";

export const metadata: Metadata = {
  title: "Резервное копирование — FinApp",
  description: "Управление резервными копиями данных",
};

export default function BackupPage() {
  return <BackupClient />;
}
