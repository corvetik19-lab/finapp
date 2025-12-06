"use client";

import { useNotifications } from "@/contexts/NotificationContext";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  CommonNotifications,
} from "@/lib/notifications/helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertTriangle, Info, Trash2 } from "lucide-react";

export default function TestNotificationsPage() {
  const { addNotification, clearAll } = useNotifications();

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Тест уведомлений</h1><p className="text-muted-foreground">Нажимайте кнопки для создания уведомлений</p></div>

      <Card><CardHeader><CardTitle>Базовые типы</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" className="text-green-600" onClick={() => addNotification(notifySuccess({ title: "Успешно!", message: "Операция выполнена", actionUrl: "/dashboard", actionLabel: "На дашборд" }))}><CheckCircle className="h-4 w-4 mr-2" />Success</Button>
        <Button variant="outline" className="text-red-600" onClick={() => addNotification(notifyError({ title: "Ошибка!", message: "Не удалось выполнить" }))}><XCircle className="h-4 w-4 mr-2" />Error</Button>
        <Button variant="outline" className="text-yellow-600" onClick={() => addNotification(notifyWarning({ title: "Внимание!", message: "Требуется внимание", actionUrl: "/settings", actionLabel: "В настройки" }))}><AlertTriangle className="h-4 w-4 mr-2" />Warning</Button>
        <Button variant="outline" className="text-blue-600" onClick={() => addNotification(notifyInfo({ title: "Информация", message: "Полезная информация" }))}><Info className="h-4 w-4 mr-2" />Info</Button>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Готовые уведомления</CardTitle></CardHeader><CardContent className="space-y-4">
        <div><h3 className="text-sm font-medium mb-2">Транзакции</h3><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => addNotification(CommonNotifications.transactionCreated("1 500 ₽"))}>Создана</Button><Button size="sm" variant="outline" onClick={() => addNotification(CommonNotifications.transactionUpdated())}>Обновлена</Button><Button size="sm" variant="outline" onClick={() => addNotification(CommonNotifications.transactionDeleted())}>Удалена</Button></div></div>
        <div><h3 className="text-sm font-medium mb-2">Бюджеты</h3><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => addNotification(CommonNotifications.budgetExceeded("Продукты", 105))}>Превышен</Button><Button size="sm" variant="outline" onClick={() => addNotification(CommonNotifications.budgetCreated())}>Создан</Button></div></div>
        <div><h3 className="text-sm font-medium mb-2">Платежи</h3><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => addNotification(CommonNotifications.paymentDue("Коммунальные", 3))}>Предстоящий</Button><Button size="sm" variant="outline" onClick={() => addNotification(CommonNotifications.paymentOverdue("Интернет"))}>Просрочен</Button></div></div>
        <div><h3 className="text-sm font-medium mb-2">Планы</h3><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => addNotification(CommonNotifications.planGoalReached("Отпуск"))}>Цель достигнута</Button><Button size="sm" variant="outline" onClick={() => addNotification(CommonNotifications.planProgress("Машина", 75))}>Прогресс</Button></div></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Управление</CardTitle></CardHeader><CardContent><Button variant="destructive" onClick={clearAll}><Trash2 className="h-4 w-4 mr-2" />Очистить все</Button></CardContent></Card>
    </div>
  );
}
