import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";

export default async function PersonalPromptsPage() {
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
        <h1>💡 Промпты</h1>
        <p style={{ color: "#6b7280" }}>Сохранённые промпты для AI</p>
      </div>
      
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <button style={{ padding: "0.75rem 1.5rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
          ➕ Новый промпт
        </button>
        
        <select style={{ padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "6px" }}>
          <option>Все категории</option>
          <option>Финансы</option>
          <option>Работа</option>
          <option>Творчество</option>
          <option>Обучение</option>
        </select>
        
        <input 
          type="search" 
          placeholder="Поиск промптов..." 
          style={{ padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", flex: 1 }}
        />
      </div>
      
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))" }}>
        <div style={{ 
          padding: "3rem", 
          textAlign: "center", 
          background: "white", 
          border: "2px dashed #d1d5db", 
          borderRadius: "8px",
          gridColumn: "1 / -1"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💡</div>
          <p style={{ fontSize: "1.125rem", fontWeight: "500", marginBottom: "0.5rem", color: "#374151" }}>
            Нет промптов
          </p>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
            Создайте первый промпт для AI
          </p>
          <button style={{ 
            padding: "0.75rem 1.5rem", 
            background: "#3b82f6", 
            color: "white", 
            border: "none", 
            borderRadius: "6px", 
            cursor: "pointer" 
          }}>
            ➕ Создать промпт
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: "2rem" }}>
        <h3>📚 Популярные категории промптов</h3>
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginTop: "1rem" }}>
          <div style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "6px", cursor: "pointer" }}>
            <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0" }}>💰</p>
            <p style={{ fontWeight: "500", margin: 0 }}>Финансы</p>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>0 промптов</p>
          </div>
          <div style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "6px", cursor: "pointer" }}>
            <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0" }}>💼</p>
            <p style={{ fontWeight: "500", margin: 0 }}>Работа</p>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>0 промптов</p>
          </div>
          <div style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "6px", cursor: "pointer" }}>
            <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0" }}>🎨</p>
            <p style={{ fontWeight: "500", margin: 0 }}>Творчество</p>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>0 промптов</p>
          </div>
          <div style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "6px", cursor: "pointer" }}>
            <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0" }}>📖</p>
            <p style={{ fontWeight: "500", margin: 0 }}>Обучение</p>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>0 промптов</p>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: "2rem", padding: "1.5rem", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fbbf24" }}>
        <p style={{ margin: 0 }}>
          <strong>🚧 В разработке:</strong> Функционал промптов находится в стадии разработки.
        </p>
      </div>
    </div>
  );
}
