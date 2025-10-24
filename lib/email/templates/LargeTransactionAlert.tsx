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

interface LargeTransactionAlertProps {
  userName: string;
  amount: number;
  categoryName: string;
  description: string;
  date: string;
  averageAmount: number;
  appUrl: string;
}

export default function LargeTransactionAlert({
  userName = "Пользователь",
  amount = 15000,
  categoryName = "Покупки",
  description = "Крупная покупка",
  date = new Date().toLocaleDateString("ru-RU"),
  averageAmount = 3000,
  appUrl = "https://finapp.com",
}: LargeTransactionAlertProps) {
  const percentageAboveAverage = ((amount - averageAmount) / averageAmount * 100).toFixed(0);
  
  return (
    <Html>
      <Head />
      <Preview>
        Обнаружена крупная транзакция: {(amount / 100).toFixed(2)} ₽
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>💸 Крупная транзакция</Heading>
          
          <Text style={text}>
            Здравствуйте, {userName}!
          </Text>
          
          <Text style={text}>
            Мы обнаружили необычно крупную транзакцию в вашем аккаунте, которая значительно превышает ваши средние расходы.
          </Text>
          
          <Section style={alertBox}>
            <Text style={alertTitle}>Детали транзакции:</Text>
            <Hr style={hr} />
            <Text style={statLine}>
              <span style={label}>Сумма:</span>
              <span style={{ ...value, color: "#dc2626", fontSize: "20px" }}>
                {(amount / 100).toFixed(2)} ₽
              </span>
            </Text>
            <Text style={statLine}>
              <span style={label}>Категория:</span>
              <span style={value}>{categoryName}</span>
            </Text>
            <Text style={statLine}>
              <span style={label}>Описание:</span>
              <span style={value}>{description}</span>
            </Text>
            <Text style={statLine}>
              <span style={label}>Дата:</span>
              <span style={value}>{date}</span>
            </Text>
          </Section>
          
          <Section style={comparisonBox}>
            <Text style={comparisonText}>
              📊 Эта транзакция <strong style={{ color: "#dc2626" }}>на {percentageAboveAverage}% больше</strong> вашего среднего чека ({(averageAmount / 100).toFixed(2)} ₽)
            </Text>
          </Section>
          
          <Text style={text}>
            Если эта транзакция запланирована и ожидаема — всё в порядке! В противном случае рекомендуем проверить детали.
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/transactions`}>
              Посмотреть транзакции
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
  backgroundColor: "#fef2f2",
  border: "2px solid #fecaca",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const alertTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#991b1b",
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

const comparisonBox = {
  backgroundColor: "#eff6ff",
  border: "2px solid #bfdbfe",
  borderRadius: "8px",
  padding: "16px",
  margin: "20px 0",
};

const comparisonText = {
  fontSize: "15px",
  color: "#1e40af",
  margin: 0,
  textAlign: "center" as const,
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
