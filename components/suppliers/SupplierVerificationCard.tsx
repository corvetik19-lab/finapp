"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  ExternalLink,
  FileText,
  Scale,
  Banknote,
  Building2,
} from "lucide-react";

// =====================================================
// Карточка верификации поставщика
// =====================================================

export interface VerificationCheck {
  type: string;
  name: string;
  status: "clean" | "warning" | "danger" | "pending" | "error";
  message: string;
  details?: string;
  url?: string;
  checkedAt?: string;
}

export interface VerificationResult {
  supplierId: string;
  riskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  checks: VerificationCheck[];
  verifiedAt: string;
  validUntil?: string;
}

interface SupplierVerificationCardProps {
  supplierId: string;
  inn?: string;
  verification?: VerificationResult;
  onRunVerification: (supplierId: string) => Promise<VerificationResult>;
}

const CHECK_ICONS: Record<string, React.ReactNode> = {
  fns: <Building2 className="h-4 w-4" />,
  rnp: <ShieldAlert className="h-4 w-4" />,
  arbitr: <Scale className="h-4 w-4" />,
  fssp: <FileText className="h-4 w-4" />,
  bankruptcy: <Banknote className="h-4 w-4" />,
  default: <Shield className="h-4 w-4" />,
};

const STATUS_CONFIG = {
  clean: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    label: "Чисто",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    label: "Внимание",
  },
  danger: {
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600",
    bgColor: "bg-red-50",
    label: "Риск",
  },
  pending: {
    icon: <Clock className="h-4 w-4" />,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    label: "Ожидание",
  },
  error: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    label: "Ошибка",
  },
};

const RISK_LEVELS = {
  low: { label: "Низкий", color: "bg-green-500", textColor: "text-green-700" },
  medium: { label: "Средний", color: "bg-yellow-500", textColor: "text-yellow-700" },
  high: { label: "Высокий", color: "bg-orange-500", textColor: "text-orange-700" },
  critical: { label: "Критический", color: "bg-red-500", textColor: "text-red-700" },
};

export function SupplierVerificationCard({
  supplierId,
  inn,
  verification,
  onRunVerification,
}: SupplierVerificationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | undefined>(verification);

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      const newResult = await onRunVerification(supplierId);
      setResult(newResult);
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const riskConfig = result ? RISK_LEVELS[result.riskLevel] : null;

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Проверка благонадёжности
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerify}
            disabled={isLoading || !inn}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {result ? "Обновить" : "Проверить"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!inn && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Для проверки необходимо указать ИНН
          </div>
        )}

        {result && (
          <>
            {/* Общий скоринг */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Скоринг риска</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${riskConfig?.textColor}`}>
                    {result.riskScore}/100
                  </span>
                  <Badge className={riskConfig?.color}>
                    {riskConfig?.label}
                  </Badge>
                </div>
              </div>
              <Progress
                value={100 - result.riskScore}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Высокий риск</span>
                <span>Низкий риск</span>
              </div>
            </div>

            {/* Список проверок */}
            <div className="space-y-2">
              {result.checks.map((check, index) => {
                const statusConfig = STATUS_CONFIG[check.status];
                const checkIcon = CHECK_ICONS[check.type] || CHECK_ICONS.default;

                return (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center justify-between p-2 rounded ${statusConfig.bgColor}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={statusConfig.color}>{checkIcon}</span>
                            <span className="text-sm font-medium">{check.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${statusConfig.color}`}>
                              {statusConfig.icon}
                            </span>
                            {check.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                asChild
                              >
                                <a href={check.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="font-medium">{check.message}</p>
                        {check.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {check.details}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            {/* Дата проверки */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>
                Проверено: {new Date(result.verifiedAt).toLocaleDateString("ru-RU")}
              </span>
              {result.validUntil && (
                <span>
                  Действительно до: {new Date(result.validUntil).toLocaleDateString("ru-RU")}
                </span>
              )}
            </div>
          </>
        )}

        {!result && inn && !isLoading && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Нажмите «Проверить» для запуска верификации
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// Индикатор риска (компактный)
// =====================================================

interface SupplierRiskIndicatorProps {
  riskScore?: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
  size?: "sm" | "md";
}

export function SupplierRiskIndicator({
  riskScore,
  riskLevel,
  size = "sm",
}: SupplierRiskIndicatorProps) {
  if (riskScore === undefined || !riskLevel) {
    return (
      <Badge variant="outline" className={size === "sm" ? "text-xs" : ""}>
        <Shield className={size === "sm" ? "h-3 w-3 mr-1" : "h-4 w-4 mr-1"} />
        Не проверен
      </Badge>
    );
  }

  const config = RISK_LEVELS[riskLevel];
  const Icon =
    riskLevel === "low"
      ? ShieldCheck
      : riskLevel === "critical"
      ? ShieldX
      : ShieldAlert;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.color} ${size === "sm" ? "text-xs" : ""}`}>
            <Icon className={size === "sm" ? "h-3 w-3 mr-1" : "h-4 w-4 mr-1"} />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Скоринг риска: {riskScore}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
