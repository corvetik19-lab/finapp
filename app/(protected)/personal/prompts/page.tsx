import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Lightbulb, Construction, Wallet, Briefcase, Palette, BookOpen } from "lucide-react";

export default async function PersonalPromptsPage() {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const categories = [
    { icon: Wallet, name: "Финансы", count: 0 },
    { icon: Briefcase, name: "Работа", count: 0 },
    { icon: Palette, name: "Творчество", count: 0 },
    { icon: BookOpen, name: "Обучение", count: 0 },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Lightbulb className="h-6 w-6" /> Промпты
        </h1>
        <p className="text-muted-foreground">Сохранённые промпты для AI</p>
      </div>
      
      <div className="flex gap-4 items-center">
        <Button><Plus className="h-4 w-4 mr-2" /> Новый промпт</Button>
        
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            <SelectItem value="finance">Финансы</SelectItem>
            <SelectItem value="work">Работа</SelectItem>
            <SelectItem value="creative">Творчество</SelectItem>
            <SelectItem value="learning">Обучение</SelectItem>
          </SelectContent>
        </Select>
        
        <Input type="search" placeholder="Поиск промптов..." className="flex-1" />
      </div>
      
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Нет промптов</p>
          <p className="text-sm text-muted-foreground mb-6">Создайте первый промпт для AI</p>
          <Button><Plus className="h-4 w-4 mr-2" /> Создать промпт</Button>
        </CardContent>
      </Card>
      
      <div>
        <h3 className="text-lg font-medium mb-4">📚 Популярные категории промптов</h3>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {categories.map((cat) => (
            <Card key={cat.name} className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <cat.icon className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="font-medium">{cat.name}</p>
                <p className="text-sm text-muted-foreground">{cat.count} промптов</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      <Alert className="bg-amber-50 border-amber-300">
        <Construction className="h-4 w-4" />
        <AlertDescription>
          <strong>В разработке:</strong> Функционал промптов находится в стадии разработки.
        </AlertDescription>
      </Alert>
    </div>
  );
}
