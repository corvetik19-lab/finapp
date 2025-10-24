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

interface CategoryStat {
  name: string;
  amount: number;
  percentage: number;
}

interface WeeklySummaryProps {
  userName: string;
  weekStart: string;
  weekEnd: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  topCategories: CategoryStat[];
  transactionCount: number;
  appUrl: string;
}

export default function WeeklySummary({
  userName = "Пользователь",
  weekStart = "14 октября",
  weekEnd = "20 октября",
  totalIncome = 50000,
  totalExpense = 25000,
  balance = 25000,
  topCategories = [
    { name: "Продукты", amount: 8000, percentage: 32 },
    { name: "Транспорт", amount: 5000, percentage: 20 },
    { name: "Развлечения", amount: 4000, percentage: 16 },
  ],
  transactionCount = 42,
  appUrl = "https://finapp.com",
}: WeeklySummaryProps) {
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : "0";
  
  return (
    <Html>
      <Head />
      <Preview>
        Ваш финансовый отчёт за {weekStart} - {weekEnd}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📊 Еженедельный отчёт</Heading>
          
          <Text style={text}>
            Здравствуйте, {userName}!
          </Text>
          
          <Text style={text}>
            Вот ваша финансовая сводка за период с <strong>{weekStart}</strong> по <strong>{weekEnd}</strong>:
          </Text>
          
          {/* Основные показатели */}
          <Section style={statsGrid}>
            <div style={statCard}>
              <Text style={statLabel}>Доходы</Text>
              <Text style={{...statValue, color: "#10b981"}}>
                +{(totalIncome / 100).toFixed(2)} ₽
              </Text>
            </div>
            <div style={statCard}>
              <Text style={statLabel}>Расходы</Text>
              <Text style={{...statValue, color: "#ef4444"}}>
                -{(totalExpense / 100).toFixed(2)} ₽
              </Text>
            </div>
            <div style={statCard}>
              <Text style={statLabel}>Баланс</Text>
              <Text style={{...statValue, color: balance >= 0 ? "#10b981" : "#ef4444"}}>
                {balance >= 0 ? "+" : ""}{(balance / 100).toFixed(2)} ₽
              </Text>
            </div>
          </Section>
          
          {/* Норма сбережений */}
          <Section style={savingsBox}>
            <Text style={savingsText}>
              💰 Норма сбережений: <strong style={{ fontSize: "20px" }}>{savingsRate}%</strong>
            </Text>
            <Text style={savingsHint}>
              {parseFloat(savingsRate) >= 20 
                ? "Отличный результат! Продолжайте в том же духе!" 
                : parseFloat(savingsRate) >= 10 
                ? "Хороший прогресс. Попробуйте увеличить норму до 20%."
                : "Рекомендуем пересмотреть расходы и увеличить сбережения."}
            </Text>
          </Section>
          
          {/* Топ категорий */}
          <Section>
            <Heading style={h2}>Топ-3 категории расходов</Heading>
            {topCategories.map((cat, idx) => (
              <div key={idx} style={categoryItem}>
                <div style={categoryHeader}>
                  <Text style={categoryName}>
                    {idx + 1}. {cat.name}
                  </Text>
                  <Text style={categoryAmount}>
                    {(cat.amount / 100).toFixed(2)} ₽
                  </Text>
                </div>
                <div style={progressBarContainer}>
                  <div style={{...progressBar, width: `${cat.percentage}%`}} />
                </div>
                <Text style={categoryPercentage}>{cat.percentage}% от расходов</Text>
              </div>
            ))}
          </Section>
          
          {/* Активность */}
          <Section style={activityBox}>
            <Text style={activityText}>
              📝 За неделю добавлено <strong>{transactionCount}</strong> транзакций
            </Text>
          </Section>
          
          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/reports`}>
              Подробный отчёт
            </Button>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footer}>
            Это автоматическое еженедельное уведомление от Finapp.
            <br />
            Вы можете отключить рассылку в <a href={`${appUrl}/settings`} style={link}>настройках профиля</a>.
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

const h2 = {
  color: "#1f2937",
  fontSize: "20px",
  fontWeight: "600",
  margin: "24px 0 16px",
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
  margin: "24px 0",
};

const statCard = {
  backgroundColor: "#f9fafb",
  border: "2px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px",
  textAlign: "center" as const,
};

const statLabel = {
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: "500",
  margin: "0 0 8px",
};

const statValue = {
  fontSize: "22px",
  fontWeight: "700",
  margin: 0,
};

const savingsBox = {
  backgroundColor: "#ecfdf5",
  border: "2px solid #6ee7b7",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const savingsText = {
  fontSize: "18px",
  color: "#065f46",
  margin: "0 0 8px",
};

const savingsHint = {
  fontSize: "14px",
  color: "#047857",
  margin: 0,
};

const categoryItem = {
  marginBottom: "20px",
};

const categoryHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
};

const categoryName = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#111827",
  margin: 0,
};

const categoryAmount = {
  fontSize: "15px",
  fontWeight: "700",
  color: "#ef4444",
  margin: 0,
};

const progressBarContainer = {
  width: "100%",
  height: "8px",
  backgroundColor: "#e5e7eb",
  borderRadius: "4px",
  overflow: "hidden",
  marginBottom: "4px",
};

const progressBar = {
  height: "100%",
  backgroundColor: "#3b82f6",
};

const categoryPercentage = {
  fontSize: "13px",
  color: "#6b7280",
  margin: 0,
};

const activityBox = {
  backgroundColor: "#eff6ff",
  border: "2px solid #bfdbfe",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const activityText = {
  fontSize: "15px",
  color: "#1e40af",
  margin: 0,
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
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
