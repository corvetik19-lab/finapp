import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";

export default async function SecuritySettingsPage() {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Безопасность</h1>
        <p style={{ color: '#64748b' }}>Настройки безопасности аккаунта</p>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '24px',
        border: '1px solid #e2e8f0'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Двухфакторная аутентификация
        </h2>
        <p style={{ color: '#64748b', marginBottom: '16px' }}>
          Добавьте дополнительный уровень защиты для вашего аккаунта
        </p>
        <button 
          style={{
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Настроить 2FA
        </button>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '24px',
        border: '1px solid #e2e8f0',
        marginTop: '16px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Активные сессии
        </h2>
        <p style={{ color: '#64748b' }}>
          Управление активными сессиями вашего аккаунта
        </p>
      </div>
    </div>
  );
}
