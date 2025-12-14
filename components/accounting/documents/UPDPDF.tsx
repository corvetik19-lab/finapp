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
    fontSize: 7,
    padding: 15,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  headerLeft: {
    width: "60%",
  },
  headerRight: {
    width: "35%",
    textAlign: "right",
    fontSize: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 3,
    marginTop: 5,
  },
  statusBox: {
    border: "1pt solid #000",
    padding: 3,
    marginBottom: 5,
    fontSize: 7,
  },
  row: {
    flexDirection: "row",
    marginBottom: 2,
  },
  label: {
    width: 100,
    fontSize: 6,
  },
  value: {
    flex: 1,
    borderBottom: "0.5pt solid #000",
    fontSize: 7,
    paddingBottom: 1,
  },
  section: {
    marginTop: 5,
    marginBottom: 5,
  },
  sectionTitle: {
    fontWeight: 700,
    fontSize: 7,
    marginBottom: 3,
    backgroundColor: "#f0f0f0",
    padding: 2,
  },
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
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
    padding: 2,
    borderRight: "0.5pt solid #000",
    fontSize: 6,
  },
  tableCellLast: {
    padding: 2,
    fontSize: 6,
  },
  colA: { width: 15, textAlign: "center" },
  colAa: { width: 15, textAlign: "center" },
  colB: { width: 100 },
  colC: { width: 20, textAlign: "center" },
  colD: { width: 25, textAlign: "center" },
  col3: { width: 30, textAlign: "right" },
  col4: { width: 35, textAlign: "right" },
  col5: { width: 40, textAlign: "right" },
  col6: { width: 20, textAlign: "center" },
  col7: { width: 20, textAlign: "center" },
  col8: { width: 35, textAlign: "right" },
  col9: { width: 45, textAlign: "right" },
  col10: { width: 30, textAlign: "center" },
  col11: { width: 30, textAlign: "center" },
  totalsRow: {
    flexDirection: "row",
    marginTop: 3,
  },
  totalLabel: {
    width: 200,
    textAlign: "right",
    paddingRight: 5,
    fontWeight: 700,
    fontSize: 7,
  },
  totalValue: {
    width: 80,
    textAlign: "right",
    fontWeight: 700,
    fontSize: 7,
  },
  signaturesSection: {
    marginTop: 10,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  signatureBlock: {
    width: "45%",
  },
  signatureTitle: {
    fontWeight: 700,
    fontSize: 7,
    marginBottom: 3,
  },
  signatureLine: {
    borderBottom: "1pt solid #000",
    height: 25,
    marginBottom: 2,
    position: "relative",
  },
  signatureCaption: {
    fontSize: 5,
    textAlign: "center",
    color: "#666",
  },
  signatureImage: {
    position: "absolute",
    width: 60,
    height: 30,
    bottom: 2,
    left: "30%",
  },
  stampImage: {
    position: "absolute",
    width: 60,
    height: 60,
    bottom: 5,
    right: 10,
    opacity: 0.7,
  },
  footer: {
    marginTop: 10,
    paddingTop: 5,
    borderTop: "0.5pt solid #ccc",
    fontSize: 6,
    color: "#666",
  },
  twoColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  column: {
    width: "48%",
  },
  infoBox: {
    border: "0.5pt solid #ccc",
    padding: 3,
    marginBottom: 3,
    fontSize: 6,
  },
});

interface UPDPDFProps {
  document: AccountingDocument;
  settings: AccountingSettings;
  counterparty: AccountingCounterparty;
  items: {
    name: string;
    code?: string;
    unit: string;
    unitCode?: string;
    quantity: number;
    price: number;
    sum: number;
    vatRate: number;
    vatSum: number;
    total: number;
    countryCode?: string;
    gtdNumber?: string;
  }[];
  updStatus?: "1" | "2"; // 1 - счёт-фактура и передаточный документ, 2 - передаточный документ
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

export function UPDPDF({ document: doc, settings, counterparty, items, updStatus = "1" }: UPDPDFProps) {
  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Шапка */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={{ fontSize: 6, marginBottom: 2 }}>
              Приложение № 1 к постановлению Правительства Российской Федерации от 26 декабря 2011 г. № 1137
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.statusBox}>
              <Text>Статус: {updStatus}</Text>
              <Text style={{ fontSize: 5 }}>
                {updStatus === "1" 
                  ? "1 - счёт-фактура и передаточный документ (акт)"
                  : "2 - передаточный документ (акт)"}
              </Text>
            </View>
          </View>
        </View>

        {/* Заголовок */}
        <Text style={styles.title}>
          УНИВЕРСАЛЬНЫЙ ПЕРЕДАТОЧНЫЙ ДОКУМЕНТ
        </Text>

        {/* Счёт-фактура */}
        <View style={styles.row}>
          <Text style={styles.label}>Счёт-фактура №</Text>
          <Text style={[styles.value, { width: 80 }]}>{doc.document_number}</Text>
          <Text style={[styles.label, { width: 30, marginLeft: 10 }]}>от</Text>
          <Text style={[styles.value, { width: 80 }]}>{formatDate(doc.document_date)}</Text>
          <Text style={[styles.label, { marginLeft: 10 }]}>Исправление №</Text>
          <Text style={[styles.value, { width: 40 }]}>—</Text>
          <Text style={[styles.label, { width: 30 }]}>от</Text>
          <Text style={[styles.value, { width: 60 }]}>—</Text>
        </View>

        {/* Продавец и Покупатель */}
        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <View style={styles.row}>
              <Text style={[styles.label, { width: 60 }]}>Продавец:</Text>
              <Text style={styles.value}>{settings.full_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { width: 60 }]}>Адрес:</Text>
              <Text style={styles.value}>{settings.legal_address || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { width: 60 }]}>ИНН/КПП:</Text>
              <Text style={styles.value}>{settings.inn}/{settings.kpp || "—"}</Text>
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.row}>
              <Text style={[styles.label, { width: 60 }]}>Покупатель:</Text>
              <Text style={styles.value}>{counterparty.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { width: 60 }]}>Адрес:</Text>
              <Text style={styles.value}>{counterparty.legal_address || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { width: 60 }]}>ИНН/КПП:</Text>
              <Text style={styles.value}>{counterparty.inn || "—"}/{counterparty.kpp || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Валюта */}
        <View style={styles.row}>
          <Text style={styles.label}>Валюта: наименование, код</Text>
          <Text style={styles.value}>Российский рубль, 643</Text>
        </View>

        {/* Таблица товаров */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.colA, { fontWeight: 700 }]}>А</Text>
            <Text style={[styles.tableCell, styles.colAa, { fontWeight: 700 }]}>Б</Text>
            <Text style={[styles.tableCell, styles.colB, { fontWeight: 700 }]}>1</Text>
            <Text style={[styles.tableCell, styles.colC, { fontWeight: 700 }]}>1а</Text>
            <Text style={[styles.tableCell, styles.colD, { fontWeight: 700 }]}>2</Text>
            <Text style={[styles.tableCell, styles.col3, { fontWeight: 700 }]}>3</Text>
            <Text style={[styles.tableCell, styles.col4, { fontWeight: 700 }]}>4</Text>
            <Text style={[styles.tableCell, styles.col5, { fontWeight: 700 }]}>5</Text>
            <Text style={[styles.tableCell, styles.col6, { fontWeight: 700 }]}>6</Text>
            <Text style={[styles.tableCell, styles.col7, { fontWeight: 700 }]}>7</Text>
            <Text style={[styles.tableCell, styles.col8, { fontWeight: 700 }]}>8</Text>
            <Text style={[styles.tableCell, styles.col9, { fontWeight: 700 }]}>9</Text>
            <Text style={[styles.tableCell, styles.col10, { fontWeight: 700 }]}>10</Text>
            <Text style={[styles.tableCellLast, styles.col11, { fontWeight: 700 }]}>11</Text>
          </View>
          
          {/* Подзаголовки */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colA, { fontSize: 5 }]}>№ п/п</Text>
            <Text style={[styles.tableCell, styles.colAa, { fontSize: 5 }]}>Код</Text>
            <Text style={[styles.tableCell, styles.colB, { fontSize: 5 }]}>Наименование</Text>
            <Text style={[styles.tableCell, styles.colC, { fontSize: 5 }]}>Код</Text>
            <Text style={[styles.tableCell, styles.colD, { fontSize: 5 }]}>Ед.</Text>
            <Text style={[styles.tableCell, styles.col3, { fontSize: 5 }]}>Кол-во</Text>
            <Text style={[styles.tableCell, styles.col4, { fontSize: 5 }]}>Цена</Text>
            <Text style={[styles.tableCell, styles.col5, { fontSize: 5 }]}>Сумма без НДС</Text>
            <Text style={[styles.tableCell, styles.col6, { fontSize: 5 }]}>В т.ч. акциз</Text>
            <Text style={[styles.tableCell, styles.col7, { fontSize: 5 }]}>Ставка НДС</Text>
            <Text style={[styles.tableCell, styles.col8, { fontSize: 5 }]}>Сумма НДС</Text>
            <Text style={[styles.tableCell, styles.col9, { fontSize: 5 }]}>Стоимость с НДС</Text>
            <Text style={[styles.tableCell, styles.col10, { fontSize: 5 }]}>Страна</Text>
            <Text style={[styles.tableCellLast, styles.col11, { fontSize: 5 }]}>№ ГТД</Text>
          </View>

          {/* Строки товаров */}
          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colA]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, styles.colAa]}>{item.code || "—"}</Text>
              <Text style={[styles.tableCell, styles.colB]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.colC]}>{item.unitCode || "—"}</Text>
              <Text style={[styles.tableCell, styles.colD]}>{item.unit}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.col4]}>{formatMoney(item.price)}</Text>
              <Text style={[styles.tableCell, styles.col5]}>{formatMoney(item.sum)}</Text>
              <Text style={[styles.tableCell, styles.col6]}>без акциза</Text>
              <Text style={[styles.tableCell, styles.col7]}>{item.vatRate}%</Text>
              <Text style={[styles.tableCell, styles.col8]}>{formatMoney(item.vatSum)}</Text>
              <Text style={[styles.tableCell, styles.col9]}>{formatMoney(item.total)}</Text>
              <Text style={[styles.tableCell, styles.col10]}>{item.countryCode || "—"}</Text>
              <Text style={[styles.tableCellLast, styles.col11]}>{item.gtdNumber || "—"}</Text>
            </View>
          ))}
        </View>

        {/* Итоги */}
        <View style={styles.totalsRow}>
          <Text style={styles.totalLabel}>Всего к оплате:</Text>
          <Text style={styles.totalValue}>{formatMoney(grandTotal)}</Text>
        </View>

        {/* Подписи */}
        <View style={styles.signaturesSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureTitle}>Руководитель организации или иное уполномоченное лицо</Text>
              <View style={styles.signatureLine}>
                {settings.signature_url && (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={settings.signature_url} style={styles.signatureImage} />
                )}
              </View>
              <Text style={styles.signatureCaption}>(подпись) {settings.director_name || ""}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureTitle}>Главный бухгалтер или иное уполномоченное лицо</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureCaption}>(подпись) {settings.accountant_name || ""}</Text>
            </View>
          </View>

          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureTitle}>Товар (груз) передал / услуги оказал</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureCaption}>(должность) (подпись) (ФИО)</Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureTitle}>Товар (груз) получил / услуги принял</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureCaption}>(должность) (подпись) (ФИО)</Text>
            </View>
          </View>
        </View>

        {/* Печать */}
        {settings.stamp_url && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={settings.stamp_url} style={styles.stampImage} />
        )}

        {/* Футер */}
        <View style={styles.footer}>
          <Text>Дата отгрузки, передачи (сдачи): {formatDate(doc.document_date)}</Text>
        </View>
      </Page>
    </Document>
  );
}
