"use client";

import { useState, useEffect } from "react";
import styles from "./APIKeys.module.css";

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function APIKeysClient() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    scopes: ["read"],
    rate_limit: 1000,
    expires_in_days: 0,
  });

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (error) {
      console.error("Failed to load API keys:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setShowForm(false);
        setFormData({ name: "", scopes: ["read"], rate_limit: 1000, expires_in_days: 0 });
        loadKeys();
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("Вы уверены? Это действие нельзя отменить.")) return;

    try {
      const res = await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        loadKeys();
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  }

  function toggleScope(scope: string) {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope],
    }));
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🔑 API Keys</h1>
          <p className={styles.subtitle}>
            Создавайте API ключи для интеграции с внешними приложениями
          </p>
        </div>
        <button
          className={styles.createBtn}
          onClick={() => setShowForm(!showForm)}
        >
          ➕ Создать API ключ
        </button>
      </div>

      {newKey && (
        <div className={styles.newKeyAlert}>
          <div className={styles.alertHeader}>
            <span>✅ API ключ создан!</span>
            <button onClick={() => setNewKey(null)}>✕</button>
          </div>
          <p className={styles.warning}>
            ⚠️ Сохраните этот ключ в безопасном месте. Вы не сможете увидеть его снова.
          </p>
          <div className={styles.keyDisplay}>
            <code>{newKey}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                alert("Ключ скопирован!");
              }}
            >
              📋 Копировать
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className={styles.form}>
          <h3>Создать новый API ключ</h3>
          
          <label>
            Название
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="My App API Key"
            />
          </label>

          <label>
            Разрешения
            <div className={styles.scopesGrid}>
              {["read", "write", "delete"].map(scope => (
                <label key={scope} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  {scope}
                </label>
              ))}
            </div>
          </label>

          <label>
            Rate Limit (запросов в час)
            <input
              type="number"
              value={formData.rate_limit}
              onChange={(e) => setFormData({...formData, rate_limit: parseInt(e.target.value)})}
              min="100"
              max="10000"
            />
          </label>

          <label>
            Срок действия (дней, 0 = без срока)
            <input
              type="number"
              value={formData.expires_in_days}
              onChange={(e) => setFormData({...formData, expires_in_days: parseInt(e.target.value)})}
              min="0"
              max="365"
            />
          </label>

          <div className={styles.formActions}>
            <button onClick={() => setShowForm(false)}>Отмена</button>
            <button
              onClick={createKey}
              disabled={creating || !formData.name}
              className={styles.submitBtn}
            >
              {creating ? "Создаём..." : "Создать ключ"}
            </button>
          </div>
        </div>
      )}

      <div className={styles.keysList}>
        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : keys.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔑</div>
            <p>У вас пока нет API ключей</p>
            <p className={styles.emptyHint}>Создайте первый ключ для начала работы с API</p>
          </div>
        ) : (
          keys.map(key => (
            <div key={key.id} className={styles.keyCard}>
              <div className={styles.keyHeader}>
                <div>
                  <h3>{key.name}</h3>
                  <code>{key.key_prefix}•••</code>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => deleteKey(key.id)}
                >
                  🗑️ Удалить
                </button>
              </div>
              
              <div className={styles.keyDetails}>
                <div className={styles.detail}>
                  <span className={styles.label}>Разрешения:</span>
                  <span>{key.scopes.join(", ")}</span>
                </div>
                <div className={styles.detail}>
                  <span className={styles.label}>Rate Limit:</span>
                  <span>{key.rate_limit} req/hour</span>
                </div>
                <div className={styles.detail}>
                  <span className={styles.label}>Последнее использование:</span>
                  <span>
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleString("ru-RU")
                      : "Никогда"}
                  </span>
                </div>
                {key.expires_at && (
                  <div className={styles.detail}>
                    <span className={styles.label}>Истекает:</span>
                    <span>{new Date(key.expires_at).toLocaleDateString("ru-RU")}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.docs}>
        <h2>📚 Документация API</h2>
        <p>Используйте созданный API ключ в заголовке <code>X-API-Key</code></p>
        
        <h3>Пример запроса:</h3>
        <pre className={styles.codeBlock}>
{`curl -X GET "https://finappka.vercel.app/api/v1/transactions?limit=10" \\
  -H "X-API-Key: your-api-key-here"`}
        </pre>

        <h3>Доступные endpoints:</h3>
        <ul className={styles.endpointsList}>
          <li><code>GET /api/v1/transactions</code> - Получить транзакции</li>
          <li><code>POST /api/v1/transactions</code> - Создать транзакцию</li>
          <li><code>GET /api/v1/accounts</code> - Получить счета</li>
          <li><code>GET /api/v1/categories</code> - Получить категории</li>
          <li><code>GET /api/v1/budgets</code> - Получить бюджеты</li>
        </ul>
      </div>
    </div>
  );
}
