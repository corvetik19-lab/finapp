import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Save, MessageCircle, Image, Video, Music, Zap, Shield, Users, CreditCard } from "lucide-react";

export default async function AIStudioModeSettingsPage() {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500" /> Настройки ИИ Студии
        </h1>
        <p className="text-muted-foreground">Конфигурация параметров работы с искусственным интеллектом</p>
      </div>
      
      {/* Gemini Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            Gemini Chat
          </CardTitle>
          <CardDescription>Настройки чата с Gemini AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Модель по умолчанию</Label>
            <Select defaultValue="gemini-2.5-flash">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (быстрый)</SelectItem>
                <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (мощный)</SelectItem>
                <SelectItem value="gemini-2.0-flash-thinking">Gemini 2.0 Flash Thinking</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Максимальная длина ответа</Label>
            <Select defaultValue="8192">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2048">2048 токенов</SelectItem>
                <SelectItem value="4096">4096 токенов</SelectItem>
                <SelectItem value="8192">8192 токенов</SelectItem>
                <SelectItem value="16384">16384 токенов</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="save-history" defaultChecked />
            <Label htmlFor="save-history" className="cursor-pointer">Сохранять историю чатов</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="thinking-mode" />
            <Label htmlFor="thinking-mode" className="cursor-pointer">Включить режим &quot;Deep Thinking&quot; по умолчанию</Label>
          </div>
        </CardContent>
      </Card>
      
      {/* Генерация изображений */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-green-500" />
            Генерация изображений
          </CardTitle>
          <CardDescription>Настройки Imagen, Flux и других моделей</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Модель по умолчанию</Label>
            <Select defaultValue="imagen4">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="imagen4">Google Imagen 4</SelectItem>
                <SelectItem value="flux-pro">Flux Pro</SelectItem>
                <SelectItem value="flux-schnell">Flux Schnell (быстрый)</SelectItem>
                <SelectItem value="stable-diffusion">Stable Diffusion XL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Разрешение по умолчанию</Label>
            <Select defaultValue="1024x1024">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="512x512">512×512</SelectItem>
                <SelectItem value="1024x1024">1024×1024</SelectItem>
                <SelectItem value="1024x1792">1024×1792 (портрет)</SelectItem>
                <SelectItem value="1792x1024">1792×1024 (пейзаж)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="watermark" />
            <Label htmlFor="watermark" className="cursor-pointer">Добавлять водяной знак</Label>
          </div>
        </CardContent>
      </Card>
      
      {/* Генерация видео */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" />
            Генерация видео
          </CardTitle>
          <CardDescription>Настройки Kling, Hailuo и других моделей</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Модель по умолчанию</Label>
            <Select defaultValue="kling">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kling">Kling AI</SelectItem>
                <SelectItem value="hailuo">Hailuo MiniMax</SelectItem>
                <SelectItem value="runway">Runway Gen-3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Длительность по умолчанию</Label>
            <Select defaultValue="5">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 секунды</SelectItem>
                <SelectItem value="5">5 секунд</SelectItem>
                <SelectItem value="10">10 секунд</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Аудио */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-orange-500" />
            Аудио и речь
          </CardTitle>
          <CardDescription>Настройки ElevenLabs, Suno и TTS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Голос по умолчанию (TTS)</Label>
            <Select defaultValue="alloy">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alloy">Alloy (нейтральный)</SelectItem>
                <SelectItem value="echo">Echo (мужской)</SelectItem>
                <SelectItem value="fable">Fable (британский)</SelectItem>
                <SelectItem value="nova">Nova (женский)</SelectItem>
                <SelectItem value="shimmer">Shimmer (тёплый)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="auto-language" defaultChecked />
            <Label htmlFor="auto-language" className="cursor-pointer">Автоматическое определение языка</Label>
          </div>
        </CardContent>
      </Card>
      
      {/* Лимиты и квоты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-500" />
            Лимиты и квоты
          </CardTitle>
          <CardDescription>Ограничения использования для сотрудников</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Лимит запросов в день (на пользователя)</Label>
            <Input type="number" defaultValue="100" />
          </div>
          <div className="space-y-2">
            <Label>Лимит генераций изображений в день</Label>
            <Input type="number" defaultValue="50" />
          </div>
          <div className="space-y-2">
            <Label>Лимит генераций видео в день</Label>
            <Input type="number" defaultValue="10" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="notify-limit" defaultChecked />
            <Label htmlFor="notify-limit" className="cursor-pointer">Уведомлять при достижении 80% лимита</Label>
          </div>
        </CardContent>
      </Card>
      
      {/* Доступ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            Безопасность и доступ
          </CardTitle>
          <CardDescription>Настройки безопасности и модерации</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="content-filter" defaultChecked />
            <Label htmlFor="content-filter" className="cursor-pointer">Включить фильтр контента (NSFW)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="audit-log" defaultChecked />
            <Label htmlFor="audit-log" className="cursor-pointer">Вести журнал аудита запросов</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="export-allowed" />
            <Label htmlFor="export-allowed" className="cursor-pointer">Разрешить экспорт истории</Label>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-4">
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Save className="h-4 w-4 mr-2" />Сохранить изменения
        </Button>
        <Button variant="outline">Сбросить к значениям по умолчанию</Button>
      </div>
      
      <Alert className="bg-purple-50 border-purple-200">
        <Zap className="h-4 w-4 text-purple-600" />
        <AlertDescription>
          <strong>Подсказка:</strong> Изменения настроек применяются ко всем пользователям организации. 
          Индивидуальные настройки можно задать в ролях.
        </AlertDescription>
      </Alert>
    </div>
  );
}
