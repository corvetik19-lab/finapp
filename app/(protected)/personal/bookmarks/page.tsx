import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Bookmark, Construction } from "lucide-react";

export default async function PersonalBookmarksPage() {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bookmark className="h-6 w-6" /> Закладки
        </h1>
        <p className="text-muted-foreground">Сохранённые ссылки и ресурсы</p>
      </div>
      
      <div className="flex gap-4 items-center">
        <Button><Plus className="h-4 w-4 mr-2" /> Добавить закладку</Button>
        
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            <SelectItem value="work">Работа</SelectItem>
            <SelectItem value="personal">Личное</SelectItem>
            <SelectItem value="learning">Обучение</SelectItem>
          </SelectContent>
        </Select>
        
        <Input type="search" placeholder="Поиск закладок..." className="flex-1" />
      </div>
      
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Нет закладок</p>
          <p className="text-sm text-muted-foreground mb-6">Добавьте первую закладку</p>
          <Button><Plus className="h-4 w-4 mr-2" /> Добавить закладку</Button>
        </CardContent>
      </Card>
      
      <Alert className="bg-amber-50 border-amber-300">
        <Construction className="h-4 w-4" />
        <AlertDescription>
          <strong>В разработке:</strong> Функционал закладок находится в стадии разработки.
        </AlertDescription>
      </Alert>
    </div>
  );
}
