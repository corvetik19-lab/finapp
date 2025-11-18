import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";

export default async function TendersModeSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1>⚙️ Настройки режима &quot;Тендеры&quot;</h1>
        <p style={{ color: "#6b7280" }}>Конфигурация параметров работы с тендерами</p>
      </div>
      
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem 0" }}>Основные настройки</h3>
        
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Валюта по умолчанию
          </label>
          <select style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "6px" }}>
            <option>RUB - Российский рубль</option>
            <option>USD - Доллар США</option>
            <option>EUR - Евро</option>
          </select>
        </div>
        
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Формат номера тендера
          </label>
          <input 
            type="text" 
            placeholder="T-{YYYY}-{###}"
            style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
          />
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.5rem 0 0 0" }}>
            Пример: T-2025-001
          </p>
        </div>
        
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input type="checkbox" />
            <span>Автоматически создавать папку для документов</span>
          </label>
        </div>
        
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input type="checkbox" />
            <span>Отправлять уведомления о приближающихся дедлайнах</span>
          </label>
        </div>
      </div>
      
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem 0" }}>Уведомления</h3>
        
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Напоминать о дедлайне за
          </label>
          <select style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "6px" }}>
            <option>1 день</option>
            <option>3 дня</option>
            <option>7 дней</option>
            <option>14 дней</option>
          </select>
        </div>
        
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked />
            <span>Email уведомления</span>
          </label>
        </div>
        
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input type="checkbox" />
            <span>Telegram уведомления</span>
          </label>
        </div>
      </div>
      
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem 0" }}>Интеграции</h3>
        
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "6px", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h4 style={{ margin: "0 0 0.25rem 0" }}>Zakupki.gov.ru</h4>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Автоматический импорт тендеров</p>
            </div>
            <button style={{ padding: "0.5rem 1rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
              Настроить
            </button>
          </div>
        </div>
        
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h4 style={{ margin: "0 0 0.25rem 0" }}>AI Анализ</h4>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Автоматический анализ документации</p>
            </div>
            <button style={{ padding: "0.5rem 1rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
              Настроить
            </button>
          </div>
        </div>
      </div>
      
      <div style={{ display: "flex", gap: "1rem" }}>
        <button style={{ padding: "0.75rem 2rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>
          💾 Сохранить изменения
        </button>
        <button style={{ padding: "0.75rem 2rem", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer" }}>
          Отмена
        </button>
      </div>
      
      <div style={{ marginTop: "2rem", padding: "1.5rem", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fbbf24" }}>
        <p style={{ margin: 0 }}>
          <strong>🚧 В разработке:</strong> Настройки режима Тендеры находятся в стадии разработки.
        </p>
      </div>
    </div>
  );
}
