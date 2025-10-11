"use client";

import { getQuickCommands } from "@/lib/ai/commands";
import styles from "./QuickCommands.module.css";

interface QuickCommandsProps {
  onCommandSelect: (command: string) => void;
}

export default function QuickCommands({ onCommandSelect }: QuickCommandsProps) {
  const commands = getQuickCommands();

  return (
    <div className={styles.container}>
      <div className={styles.title}>🚀 Быстрые команды</div>
      <div className={styles.grid}>
        {commands.map((cmd, idx) => (
          <button
            key={idx}
            className={styles.commandBtn}
            onClick={() => onCommandSelect(cmd.command)}
          >
            <span className={styles.icon}>{cmd.icon}</span>
            <span className={styles.label}>{cmd.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.hint}>
        <strong>💡 Подсказка:</strong> Вы также можете писать свои команды на естественном языке, например: &quot;Добавь 1000р на продукты&quot; или &quot;Покажи траты за неделю&quot;
        <p>Попробуйте команды: &quot;баланс&quot;, &quot;добавь 100 кофе&quot;, &quot;последние&quot;</p>
      </div>
    </div>
  );
}
