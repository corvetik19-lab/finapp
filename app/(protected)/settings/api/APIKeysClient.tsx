"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Key, Plus, Trash2, Loader2, Copy } from "lucide-react";

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
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Key className="h-6 w-6" />API Keys</h1><p className="text-muted-foreground">Интеграция с внешними приложениями</p></div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />Создать ключ</Button>
      </div>

      {newKey && (
        <Alert><AlertTitle>Ключ создан!</AlertTitle><AlertDescription className="space-y-2">
          <p className="text-yellow-600">Сохраните ключ - вы не увидите его снова!</p>
          <div className="flex items-center gap-2"><code className="flex-1 bg-muted p-2 rounded text-sm">{newKey}</code><Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); }}><Copy className="h-4 w-4" /></Button></div>
        </AlertDescription></Alert>
      )}

      {showForm && (
        <Card><CardHeader><CardTitle>Новый API ключ</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="space-y-2"><Label>Название</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="My App" /></div>
          <div className="space-y-2"><Label>Разрешения</Label><div className="flex gap-4">{["read", "write", "delete"].map(scope => (<div key={scope} className="flex items-center gap-2"><Checkbox checked={formData.scopes.includes(scope)} onCheckedChange={() => toggleScope(scope)} /><span>{scope}</span></div>))}</div></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Rate Limit (req/hour)</Label><Input type="number" value={formData.rate_limit} onChange={(e) => setFormData({...formData, rate_limit: parseInt(e.target.value)})} min={100} max={10000} /></div>
            <div className="space-y-2"><Label>Срок (дней, 0=бессрочно)</Label><Input type="number" value={formData.expires_in_days} onChange={(e) => setFormData({...formData, expires_in_days: parseInt(e.target.value)})} min={0} max={365} /></div>
          </div>
          <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button><Button onClick={createKey} disabled={creating || !formData.name}>{creating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Создаём...</> : "Создать"}</Button></div>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>Ваши ключи</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : keys.length === 0 ? (
            <div className="text-center py-8"><Key className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Ключей пока нет</p></div>
          ) : (
            <div className="space-y-3">
              {keys.map(key => (
                <div key={key.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div><p className="font-medium">{key.name}</p><code className="text-sm text-muted-foreground">{key.key_prefix}•••</code></div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex gap-1">{key.scopes.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
                      <p>{key.rate_limit} req/h</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteKey(key.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>Документация</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm">Используйте ключ в заголовке <code className="bg-muted px-1 rounded">X-API-Key</code></p>
        <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">{`curl -X GET "https://finappka.vercel.app/api/v1/transactions" \\
  -H "X-API-Key: your-key"`}</pre>
        <div className="text-sm space-y-1">
          <p className="font-medium">Endpoints:</p>
          <p><code className="bg-muted px-1 rounded">GET /api/v1/transactions</code></p>
          <p><code className="bg-muted px-1 rounded">POST /api/v1/transactions</code></p>
          <p><code className="bg-muted px-1 rounded">GET /api/v1/accounts</code></p>
        </div>
      </CardContent></Card>
    </div>
  );
}
