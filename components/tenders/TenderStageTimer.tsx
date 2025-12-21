'use client';

import { useMemo } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TenderStageTimerProps {
  enteredAt: string | Date;
  warningThresholdDays?: number;
  showIcon?: boolean;
  className?: string;
}

export function TenderStageTimer({
  enteredAt,
  warningThresholdDays = 3,
  showIcon = true,
  className = ''
}: TenderStageTimerProps) {
  const { isWarning, formatted } = useMemo(() => {
    const entered = new Date(enteredAt);
    const now = new Date();
    const diffMs = now.getTime() - entered.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let formatted: string;
    if (diffDays > 0) {
      formatted = `${diffDays}д ${diffHours}ч`;
    } else if (diffHours > 0) {
      formatted = `${diffHours}ч ${diffMinutes}м`;
    } else {
      formatted = `${diffMinutes}м`;
    }

    return {
      duration: { days: diffDays, hours: diffHours, minutes: diffMinutes },
      isWarning: diffDays >= warningThresholdDays,
      formatted
    };
  }, [enteredAt, warningThresholdDays]);

  const tooltipText = useMemo(() => {
    const entered = new Date(enteredAt);
    return `На этапе с ${entered.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  }, [enteredAt]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`inline-flex items-center gap-1 text-sm ${
              isWarning 
                ? 'text-amber-600 font-medium' 
                : 'text-gray-500'
            } ${className}`}
          >
            {showIcon && (
              isWarning 
                ? <AlertTriangle className="h-3.5 w-3.5" />
                : <Clock className="h-3.5 w-3.5" />
            )}
            <span>{formatted}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
          {isWarning && (
            <p className="text-amber-500 text-xs mt-1">
              Тендер на этапе более {warningThresholdDays} дней
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function formatStageDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}д ${hours}ч`;
  } else if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  } else {
    return `${minutes}м`;
  }
}
