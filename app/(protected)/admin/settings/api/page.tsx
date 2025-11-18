import { Metadata } from "next";
import APIKeysClient from "./APIKeysClient";

export const metadata: Metadata = {
  title: "API Keys — FinApp",
  description: "Управление API ключами для REST API",
};

export default function APIKeysPage() {
  return <APIKeysClient />;
}
