"use client";

import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import type { AccountingDocument, AccountingSettings, AccountingCounterparty } from "@/lib/accounting/types";

// Регистрация шрифта
Font.register({
  family: "Roboto",
  fonts: [
    { src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 8,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 10,
    borderBottom: "1pt solid #000",
    paddingBottom: 5,
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 9,
    textAlign: "center",
    marginBottom: 3,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: 120,
    fontWeight: 700,
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderTop: "1pt solid #000",
    borderLeft: "1pt solid #000",
    borderRight: "1pt solid #000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #000",
    borderLeft: "1pt solid #000",
    borderRight: "1pt solid #000",
  },
  tableCell: {
    padding: 3,
    borderRight: "1pt solid #000",
  },
  tableCellLast: {
    padding: 3,
  },
  colNum: { width: 20, textAlign: "center" },
  colName: { width: 150 },
  colUnit: { width: 40, textAlign: "center" },
  colQty: { width: 40, textAlign: "right" },
  colPrice: { width: 60, textAlign: "right" },
  colSum: { width: 70, textAlign: "right" },
  colVat: { width: 40, textAlign: "center" },
  colVatSum: { width: 60, textAlign: "right" },
  colTotal: { width: 70, textAlign: "right" },
  totalsSection: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  totalLabel: {
    width: 150,
    textAlign: "right",
    marginRight: 10,
  },
  totalValue: {
    width: 100,
    textAlign: "right",
    fontWeight: 700,
  },
  signaturesSection: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    width: "45%",
  },
  signatureLine: {
    borderBottom: "1pt solid #000",
    marginTop: 20,
    marginBottom: 3,
  },
  signatureLabel: {
    fontSize: 7,
    textAlign: "center",
  },
  signatureImage: {
    position: "absolute",
    width: 80,
    height: 40,
    bottom: 25,
    left: "50%",
    marginLeft: -40,
  },
  stampImage: {
    position: "absolute",
    width: 70,
    height: 70,
    bottom: 10,
    right: 20,
    opacity: 0.8,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    fontSize: 7,
    color: "#666",
    textAlign: "center",
  },
});

interface InvoicePDFProps {
  document: AccountingDocument;
  settings: AccountingSettings;
  counterparty: AccountingCounterparty;
  items: {
    name: string;
    unit: string;
    quantity: number;
    price: number;
    sum: number;
    vatRate: number;
    vatSum: number;
    total: number;
  }[];
}

function formatMoney(kopeks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kopeks / 100);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function InvoicePDF({ document: doc, settings, counterparty, items }: InvoicePDFProps) {
  const totalVat = items.reduce((s, i) => s + i.vatSum, 0);
  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.title}>
            СЧЁТ-ФАКТУРА № {doc.document_number} от {formatDate(doc.document_date)}
          </Text>
          <Text style={styles.subtitle}>
            Исправление № — от —
          </Text>
        </View>

        {/* Продавец */}
        <View style={styles.row}>
          <Text style={styles.label}>Продавец:</Text>
          <Text style={styles.value}>{settings.full_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Адрес:</Text>
          <Text style={styles.value}>{settings.legal_address || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>ИНН/КПП продавца:</Text>
          <Text style={styles.value}>{settings.inn}/{settings.kpp || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Грузоотправитель:</Text>
          <Text style={styles.value}>он же</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Грузополучатель:</Text>
          <Text style={styles.value}>{counterparty.name}</Text>
        </View>

        {/* Покупатель */}
        <View style={[styles.row, { marginTop: 5 }]}>
          <Text style={styles.label}>Покупатель:</Text>
          <Text style={styles.value}>{counterparty.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Адрес:</Text>
          <Text style={styles.value}>{counterparty.legal_address || counterparty.actual_address || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>ИНН/КПП покупателя:</Text>
          <Text style={styles.value}>{counterparty.inn || "—"}/{counterparty.kpp || "—"}</Text>
        </View>

        {/* К платёжному документу */}
        <View style={styles.row}>
          <Text style={styles.label}>К платёжно-расчётному документу:</Text>
          <Text style={styles.value}>—</Text>
        </View>

        {/* Валюта */}
        <View style={styles.row}>
          <Text style={styles.label}>Валюта: наименование, код:</Text>
          <Text style={styles.value}>Российский рубль, 643</Text>
        </View>

        {/* Таблица товаров */}
        <View style={styles.table}>
          {/* Заголовок таблицы */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.colNum, { fontWeight: 700 }]}>№</Text>
            <Text style={[styles.tableCell, styles.colName, { fontWeight: 700 }]}>Наименование</Text>
            <Text style={[styles.tableCell, styles.colUnit, { fontWeight: 700 }]}>Ед.</Text>
            <Text style={[styles.tableCell, styles.colQty, { fontWeight: 700 }]}>Кол-во</Text>
            <Text style={[styles.tableCell, styles.colPrice, { fontWeight: 700 }]}>Цена</Text>
            <Text style={[styles.tableCell, styles.colSum, { fontWeight: 700 }]}>Сумма без НДС</Text>
            <Text style={[styles.tableCell, styles.colVat, { fontWeight: 700 }]}>НДС %</Text>
            <Text style={[styles.tableCell, styles.colVatSum, { fontWeight: 700 }]}>Сумма НДС</Text>
            <Text style={[styles.tableCellLast, styles.colTotal, { fontWeight: 700 }]}>Всего с НДС</Text>
          </View>

          {/* Строки товаров */}
          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colNum]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, styles.colName]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.colUnit]}>{item.unit}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{formatMoney(item.price)}</Text>
              <Text style={[styles.tableCell, styles.colSum]}>{formatMoney(item.sum)}</Text>
              <Text style={[styles.tableCell, styles.colVat]}>{item.vatRate}%</Text>
              <Text style={[styles.tableCell, styles.colVatSum]}>{formatMoney(item.vatSum)}</Text>
              <Text style={[styles.tableCellLast, styles.colTotal]}>{formatMoney(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Итоги */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Всего к оплате:</Text>
            <Text style={styles.totalValue}>{formatMoney(grandTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>В том числе НДС:</Text>
            <Text style={styles.totalValue}>{formatMoney(totalVat)}</Text>
          </View>
        </View>

        {/* Подписи */}
        <View style={styles.signaturesSection}>
          <View style={styles.signatureBlock}>
            <Text>Руководитель организации</Text>
            <Text>или иное уполномоченное лицо</Text>
            <View style={{ position: "relative" }}>
              <View style={styles.signatureLine} />
              {settings.signature_url && (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={settings.signature_url} style={styles.signatureImage} />
              )}
            </View>
            <Text style={styles.signatureLabel}>
              {settings.director_name || "(подпись)                    (ФИО)"}
            </Text>
          </View>

          <View style={styles.signatureBlock}>
            <Text>Главный бухгалтер</Text>
            <Text>или иное уполномоченное лицо</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>
              {settings.accountant_name || "(подпись)                    (ФИО)"}
            </Text>
          </View>
        </View>

        {/* Печать */}
        {settings.stamp_url && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={settings.stamp_url} style={styles.stampImage} />
        )}

        {/* Футер */}
        <Text style={styles.footer}>
          Счёт-фактура сформирован в электронном виде
        </Text>
      </Page>
    </Document>
  );
}
