"use client";

import { ReactNode } from 'react';
import { TourProvider } from '@reactour/tour';

interface TourWrapperProps {
  children: ReactNode;
}

export default function TourWrapper({ children }: TourWrapperProps) {
  const handleTourClose = async () => {
    try {
      // Определяем текущую страницу
      const pathname = window.location.pathname;
      let currentPage: string = 'dashboard';
      
      if (pathname.includes('/transactions')) currentPage = 'transactions';
      else if (pathname.includes('/budgets')) currentPage = 'budgets';
      else if (pathname.includes('/reports')) currentPage = 'reports';
      else if (pathname.includes('/finance/ai-chat')) currentPage = 'ai-chat';
      
      // Получаем текущие настройки
      const response = await fetch('/api/settings/tour');
      if (!response.ok) return;
      
      const settings = await response.json();
      
      // Обновляем статус завершения для текущей страницы
      const updatedTours = {
        ...settings.completedTours,
        [currentPage]: true,
      };
      
      // Сохраняем в API
      await fetch('/api/settings/tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: settings.enabled,
          completedTours: updatedTours,
        }),
      });
    } catch (error) {
      console.error('Failed to save tour completion:', error);
    }
  };

  return (
    <TourProvider
      steps={[]}
      onClickClose={({ setIsOpen }) => {
        handleTourClose();
        setIsOpen(false);
      }}
      styles={{
        popover: (base) => ({
          ...base,
          borderRadius: 12,
          padding: 20,
          maxWidth: 400,
        }),
        maskArea: (base) => ({ ...base, rx: 8 }),
        badge: (base) => ({
          ...base,
          backgroundColor: '#2563eb',
        }),
      }}
      padding={10}
      scrollSmooth
    >
      {children}
    </TourProvider>
  );
}
