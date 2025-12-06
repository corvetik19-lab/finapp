"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Key, Plus, Trash2, Copy, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

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

interface Props {
  apiKeys: APIKey[];
}

export default function ApiKeysManager({ apiKeys: initialKeys }: Props) {
  const [keys, setKeys] = useState<APIKey[]>(initialKeys);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    scopes: ["read"],
    rate_limit: 1000,
    expires_in_days: 0,
  });

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
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Key className="h-6 w-6" />API Keys</h1><p className="text-sm text-muted-foreground">Создавайте API ключи для интеграции</p></div><Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />Создать ключ</Button></div>

      {newKey && <Alert className="border-green-500 bg-green-50"><CheckCircle2 className="h-4 w-4 text-green-600" /><AlertTitle>Ключ создан!</AlertTitle><AlertDescription className="space-y-2"><p className="text-sm text-yellow-700 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Сохраните ключ — вы не увидите его снова</p><div className="flex items-center gap-2"><code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">{newKey}</code><Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(newKey); }}><Copy className="h-4 w-4 mr-1" />Копировать</Button></div></AlertDescription></Alert>}

      {showForm && <Card><CardHeader><CardTitle className="text-base">Новый API ключ</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="space-y-1"><Label>Название</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="My App API Key" /></div>
        <div className="space-y-1"><Label>Разрешения</Label><div className="flex gap-4">{["read", "write", "delete"].map(scope => <label key={scope} className="flex items-center gap-2 cursor-pointer"><Checkbox checked={formData.scopes.includes(scope)} onCheckedChange={() => toggleScope(scope)} /><span className="text-sm">{scope}</span></label>)}</div></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label>Rate Limit (req/hour)</Label><Input type="number" value={formData.rate_limit} onChange={(e) => setFormData({...formData, rate_limit: parseInt(e.target.value)})} min={100} max={10000} /></div><div className="space-y-1"><Label>Срок (дней, 0 = бессрочно)</Label><Input type="number" value={formData.expires_in_days} onChange={(e) => setFormData({...formData, expires_in_days: parseInt(e.target.value)})} min={0} max={365} /></div></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button><Button onClick={createKey} disabled={creating || !formData.name}>{creating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Создаём...</> : 'Создать ключ'}</Button></div>
      </CardContent></Card>}

      <div className="space-y-3">
        {loading ? <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Загрузка...</div> : keys.length === 0 ? <div className="text-center py-8"><Key className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p>У вас пока нет API ключей</p><p className="text-sm text-muted-foreground">Создайте первый ключ для работы с API</p></div> : keys.map(key => <Card key={key.id}><CardContent className="pt-4"><div className="flex items-start justify-between"><div><h3 className="font-medium">{key.name}</h3><code className="text-xs text-muted-foreground">{key.key_prefix}•••</code></div><Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteKey(key.id)}><Trash2 className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm"><div><span className="text-muted-foreground">Разрешения: </span>{key.scopes.map(s => <Badge key={s} variant="secondary" className="mr-1">{s}</Badge>)}</div><div><span className="text-muted-foreground">Limit: </span>{key.rate_limit} req/h</div><div><span className="text-muted-foreground">Последнее: </span>{key.last_used_at ? new Date(key.last_used_at).toLocaleString("ru-RU") : "Никогда"}</div>{key.expires_at && <div><span className="text-muted-foreground">Истекает: </span>{new Date(key.expires_at).toLocaleDateString("ru-RU")}</div>}</div></CardContent></Card>)}
      </div>

      <Card><CardHeader><CardTitle className="text-base">Документация API</CardTitle><CardDescription>Используйте ключ в заголовке <code className="bg-muted px-1 rounded">X-API-Key</code></CardDescription></CardHeader><CardContent className="space-y-4">
        <div><h4 className="font-medium text-sm mb-1">Пример:</h4><pre className="bg-muted rounded p-3 text-xs overflow-x-auto">{`curl -X GET "https://finappka.vercel.app/api/v1/transactions?limit=10" \\
  -H "X-API-Key: your-api-key-here"`}</pre></div>
        <div><h4 className="font-medium text-sm mb-1">Endpoints:</h4><ul className="text-sm space-y-1">{["GET /api/v1/transactions — Транзакции","POST /api/v1/transactions — Создать","GET /api/v1/accounts — Счета","GET /api/v1/categories — Категории","GET /api/v1/budgets — Бюджеты"].map(e => <li key={e}><code className="text-xs bg-muted px-1 rounded">{e.split(" — ")[0]}</code> — {e.split(" — ")[1]}</li>)}</ul></div>
      </CardContent></Card>
    </div>
  );
}
