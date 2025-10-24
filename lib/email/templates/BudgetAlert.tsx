import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

interface BudgetAlertEmailProps {
  userName: string;
  categoryName: string;
  budgetLimit: number;
  currentSpent: number;
  percentage: number;
  appUrl: string;
}

export default function BudgetAlertEmail({
  userName = "Пользователь",
  categoryName = "Продукты",
  budgetLimit = 10000,
  currentSpent = 8500,
  percentage = 85,
  appUrl = "https://finapp.com",
}: BudgetAlertEmailProps) {
  const isOverBudget = percentage >= 100;
  const isWarning = percentage >= 80 && percentage < 100;
  
  const statusColor = isOverBudget ? "#dc2626" : isWarning ? "#f59e0b" : "#10b981";
  const statusText = isOverBudget ? "Бюджет превышен!" : "Внимание: бюджет на исходе";
  
  return (
    <Html>
      <Head />
      <Preview>
        {`${statusText} - ${categoryName}: ${Math.round(percentage)}%`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>⚠️ {statusText}</Heading>
          
          <Text style={text}>
            Здравствуйте, {userName}!
          </Text>
          
          <Text style={text}>
            Мы обнаружили, что ваши расходы по категории <strong>{categoryName}</strong> {isOverBudget ? "превысили" : "приближаются к"} установленному лимиту.
          </Text>
          
          <Section style={alertBox}>
            <Text style={alertTitle}>Детали бюджета:</Text>
            <Hr style={hr} />
            <Text style={statLine}>
              <span style={label}>Категория:</span>
              <span style={value}>{categoryName}</span>
            </Text>
            <Text style={statLine}>
              <span style={label}>Лимит:</span>
              <span style={value}>{(budgetLimit / 100).toFixed(2)} ₽</span>
            </Text>
            <Text style={statLine}>
              <span style={label}>Потрачено:</span>
              <span style={value}>{(currentSpent / 100).toFixed(2)} ₽</span>
            </Text>
            <Text style={statLine}>
              <span style={label}>Использовано:</span>
              <span style={{ ...value, color: statusColor, fontWeight: "bold" }}>
                {percentage.toFixed(1)}%
              </span>
            </Text>
          </Section>
          
          {isOverBudget && (
            <Text style={{ ...text, color: "#dc2626", fontWeight: "600" }}>
              💸 Вы превысили бюджет на {((currentSpent - budgetLimit) / 100).toFixed(2)} ₽
            </Text>
          )}
          
          <Text style={text}>
            Рекомендуем пересмотреть расходы в этой категории или скорректировать бюджет.
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/budgets`}>
              Посмотреть бюджеты
            </Button>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footer}>
            Это автоматическое уведомление от Finapp.
            <br />
            Вы можете настроить уведомления в <a href={`${appUrl}/settings`} style={link}>настройках профиля</a>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "600px",
};

const h1 = {
  color: "#1f2937",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const alertBox = {
  backgroundColor: "#fef3c7",
  border: "2px solid #fbbf24",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const alertTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#92400e",
  margin: "0 0 12px",
};

const statLine = {
  display: "flex",
  justifyContent: "space-between",
  margin: "8px 0",
  fontSize: "15px",
};

const label = {
  color: "#6b7280",
  fontWeight: "500",
};

const value = {
  color: "#111827",
  fontWeight: "600",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "16px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "22px",
  marginTop: "32px",
  textAlign: "center" as const,
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};
