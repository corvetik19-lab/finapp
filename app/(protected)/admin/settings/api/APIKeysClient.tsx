"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Copy, Plus, Key, X } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" /> API Keys
          </h1>
          <p className="text-muted-foreground">
            Создавайте API ключи для интеграции с внешними приложениями
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Создать API ключ
        </Button>
      </div>

      {newKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-800 font-medium">✅ API ключ создан!</span>
            <Button variant="ghost" size="icon" onClick={() => setNewKey(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-amber-700 text-sm mb-3">
            ⚠️ Сохраните этот ключ в безопасном месте. Вы не сможете увидеть его снова.
          </p>
          <div className="flex items-center gap-2 bg-white p-3 rounded border">
            <code className="flex-1 font-mono text-sm break-all">{newKey}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                alert("Ключ скопирован!");
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Копировать
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-card rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">Создать новый API ключ</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Название</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="My App API Key"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Разрешения</label>
              <div className="flex gap-4">
                {["read", "write", "delete"].map(scope => (
                  <label key={scope} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.scopes.includes(scope)}
                      onCheckedChange={() => toggleScope(scope)}
                    />
                    <span className="text-sm">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Rate Limit (запросов в час)</label>
              <Input
                type="number"
                value={formData.rate_limit}
                onChange={(e) => setFormData({...formData, rate_limit: parseInt(e.target.value)})}
                min={100}
                max={10000}
                className="w-40"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Срок действия (дней, 0 = без срока)</label>
              <Input
                type="number"
                value={formData.expires_in_days}
                onChange={(e) => setFormData({...formData, expires_in_days: parseInt(e.target.value)})}
                min={0}
                max={365}
                className="w-40"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
              <Button
                onClick={createKey}
                disabled={creating || !formData.name}
              >
                {creating ? "Создаём..." : "Создать ключ"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium">У вас пока нет API ключей</p>
            <p className="text-muted-foreground text-sm">Создайте первый ключ для начала работы с API</p>
          </div>
        ) : (
          keys.map(key => (
            <div key={key.id} className="bg-card rounded-xl border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{key.name}</h3>
                  <code className="text-sm text-muted-foreground">{key.key_prefix}•••</code>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => deleteKey(key.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Удалить
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span className="text-muted-foreground">Разрешения:</span>
                  <span className="font-medium">{key.scopes.join(", ")}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span className="text-muted-foreground">Rate Limit:</span>
                  <span className="font-medium">{key.rate_limit} req/hour</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span className="text-muted-foreground">Последнее использование:</span>
                  <span className="font-medium">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleString("ru-RU")
                      : "Никогда"}
                  </span>
                </div>
                {key.expires_at && (
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span className="text-muted-foreground">Истекает:</span>
                    <span className="font-medium">{new Date(key.expires_at).toLocaleDateString("ru-RU")}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-card rounded-xl border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-2">📚 Документация API</h2>
        <p className="text-muted-foreground mb-4">Используйте созданный API ключ в заголовке <code className="bg-muted px-1 rounded">X-API-Key</code></p>
        
        <h3 className="font-medium mb-2">Пример запроса:</h3>
        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto mb-4">
{`curl -X GET "https://finappka.vercel.app/api/v1/transactions?limit=10" \\
  -H "X-API-Key: your-api-key-here"`}
        </pre>

        <h3 className="font-medium mb-2">Доступные endpoints:</h3>
        <ul className="space-y-1 text-sm">
          <li><code className="bg-muted px-1 rounded">GET /api/v1/transactions</code> - Получить транзакции</li>
          <li><code className="bg-muted px-1 rounded">POST /api/v1/transactions</code> - Создать транзакцию</li>
          <li><code className="bg-muted px-1 rounded">GET /api/v1/accounts</code> - Получить счета</li>
          <li><code className="bg-muted px-1 rounded">GET /api/v1/categories</code> - Получить категории</li>
          <li><code className="bg-muted px-1 rounded">GET /api/v1/budgets</code> - Получить бюджеты</li>
        </ul>
      </div>
    </div>
  );
}
