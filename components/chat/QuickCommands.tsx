"use client";

import { getQuickCommands } from "@/lib/ai/commands";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Rocket } from "lucide-react";

interface QuickCommandsProps {
  onCommandSelect: (command: string) => void;
}

export default function QuickCommands({ onCommandSelect }: QuickCommandsProps) {
  const commands = getQuickCommands();

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Rocket className="h-5 w-5" />Быстрые команды</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {commands.map((cmd, idx) => (
            <Button key={idx} variant="outline" className="flex items-center gap-2 justify-start h-auto py-2" onClick={() => onCommandSelect(cmd.command)}>
              <span>{cmd.icon}</span><span className="text-sm">{cmd.label}</span>
            </Button>
          ))}
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
          <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div><p><strong>Подсказка:</strong> Вы также можете писать свои команды на естественном языке</p><p className="text-muted-foreground mt-1">Примеры: «баланс», «добавь 100 кофе», «последние»</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
