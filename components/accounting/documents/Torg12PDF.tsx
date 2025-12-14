"use client";

import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { AccountingDocument, AccountingSettings, formatMoney } from "@/lib/accounting/types";

// Регистрируем шрифт для кириллицы
Font.register({
  family: "Roboto",
  fonts: [
    { src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf", fontWeight: 400 },
    { src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 8,
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
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
    marginBottom: 10,
  },
  unifiedForm: {
    textAlign: "right",
    fontSize: 7,
    marginBottom: 5,
  },
  infoBlock: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  infoLabel: {
    width: 120,
    fontSize: 7,
  },
  infoValue: {
    flex: 1,
    fontSize: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    paddingBottom: 1,
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: "#000",
    borderBottomWidth: 0,
  },
  tableRowLast: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: "#000",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
  },
  tableCell: {
    padding: 3,
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    fontSize: 7,
    textAlign: "center",
  },
  tableCellLast: {
    padding: 3,
    fontSize: 7,
    textAlign: "center",
  },
  col1: { width: "5%" },
  col2: { width: "25%" },
  col3: { width: "8%" },
  col4: { width: "8%" },
  col5: { width: "8%" },
  col6: { width: "8%" },
  col7: { width: "8%" },
  col8: { width: "10%" },
  col9: { width: "10%" },
  col10: { width: "10%" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 5,
    paddingRight: 10,
  },
  totalsLabel: {
    fontSize: 8,
    fontWeight: 700,
    marginRight: 10,
  },
  totalsValue: {
    fontSize: 8,
    fontWeight: 700,
  },
  signaturesBlock: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureColumn: {
    width: "45%",
  },
  signatureRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 15,
  },
  signatureLabel: {
    fontSize: 8,
    width: 80,
  },
  signatureLine: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    marginHorizontal: 5,
    height: 20,
  },
  signatureHint: {
    fontSize: 6,
    color: "#666",
    textAlign: "center",
    marginTop: 2,
  },
  stampPlaceholder: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  stampText: {
    fontSize: 6,
    color: "#999",
    textAlign: "center",
  },
  stampImage: {
    width: 80,
    height: 80,
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#666",
  },
});

interface Torg12PDFProps {
  document: AccountingDocument;
  settings: AccountingSettings;
  items: {
    name: string;
    unit: string;
    quantity: number;
    price: number;
    amount: number;
    vat_rate?: number;
    vat_amount?: number;
  }[];
}

export function Torg12PDF({ document: doc, settings, items }: Torg12PDFProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalVat = items.reduce((sum, item) => sum + (item.vat_amount || 0), 0);
  const totalWithVat = totalAmount + totalVat;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Унифицированная форма */}
        <View style={styles.unifiedForm}>
          <Text>Унифицированная форма № ТОРГ-12</Text>
          <Text>Утверждена постановлением Госкомстата России от 25.12.98 № 132</Text>
        </View>

        {/* Шапка с реквизитами */}
        <View style={styles.header}>
          <View style={{ width: "60%" }}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Грузоотправитель:</Text>
              <Text style={styles.infoValue}>
                {settings.full_name}, ИНН {settings.inn}
                {settings.kpp && `, КПП ${settings.kpp}`}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Адрес:</Text>
              <Text style={styles.infoValue}>{settings.legal_address || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Грузополучатель:</Text>
              <Text style={styles.infoValue}>
                {doc.counterparty_name}
                {doc.counterparty_inn && `, ИНН ${doc.counterparty_inn}`}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Поставщик:</Text>
              <Text style={styles.infoValue}>
                {settings.full_name}, ИНН {settings.inn}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Плательщик:</Text>
              <Text style={styles.infoValue}>{doc.counterparty_name}</Text>
            </View>
          </View>
          <View style={{ width: "35%" }}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Код по ОКПО:</Text>
              <Text style={styles.infoValue}>{settings.okpo || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Вид деятельности:</Text>
              <Text style={styles.infoValue}>{settings.okved || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Заголовок документа */}
        <Text style={styles.title}>
          ТОВАРНАЯ НАКЛАДНАЯ № {doc.document_number}
        </Text>
        <Text style={styles.subtitle}>
          от {new Date(doc.document_date).toLocaleDateString("ru-RU")}
        </Text>

        {/* Таблица товаров */}
        <View style={styles.table}>
          {/* Заголовок таблицы */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.col1]}>№</Text>
            <Text style={[styles.tableCell, styles.col2]}>Наименование товара</Text>
            <Text style={[styles.tableCell, styles.col3]}>Ед. изм.</Text>
            <Text style={[styles.tableCell, styles.col4]}>Кол-во</Text>
            <Text style={[styles.tableCell, styles.col5]}>Цена</Text>
            <Text style={[styles.tableCell, styles.col6]}>Сумма без НДС</Text>
            <Text style={[styles.tableCell, styles.col7]}>Ставка НДС</Text>
            <Text style={[styles.tableCell, styles.col8]}>Сумма НДС</Text>
            <Text style={[styles.tableCell, styles.col9]}>Сумма с НДС</Text>
            <Text style={[styles.tableCellLast, styles.col10]}>Примечание</Text>
          </View>

          {/* Строки товаров */}
          {items.map((item, index) => (
            <View 
              key={index} 
              style={index === items.length - 1 ? styles.tableRowLast : styles.tableRow}
            >
              <Text style={[styles.tableCell, styles.col1]}>{index + 1}</Text>
              <Text style={[styles.tableCell, styles.col2, { textAlign: "left" }]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{item.unit}</Text>
              <Text style={[styles.tableCell, styles.col4]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.col5]}>{(item.price / 100).toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.col6]}>{(item.amount / 100).toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.col7]}>{item.vat_rate ? `${item.vat_rate}%` : "Без НДС"}</Text>
              <Text style={[styles.tableCell, styles.col8]}>{item.vat_amount ? (item.vat_amount / 100).toFixed(2) : "—"}</Text>
              <Text style={[styles.tableCell, styles.col9]}>{((item.amount + (item.vat_amount || 0)) / 100).toFixed(2)}</Text>
              <Text style={[styles.tableCellLast, styles.col10]}>—</Text>
            </View>
          ))}
        </View>

        {/* Итоги */}
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Итого:</Text>
          <Text style={styles.totalsValue}>
            Количество: {totalQuantity} | 
            Сумма без НДС: {formatMoney(totalAmount)} | 
            НДС: {formatMoney(totalVat)} | 
            Всего с НДС: {formatMoney(totalWithVat)}
          </Text>
        </View>

        {/* Подписи */}
        <View style={styles.signaturesBlock}>
          <View style={styles.signatureColumn}>
            <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 10 }}>Отпуск груза разрешил</Text>
            <View style={styles.signatureRow}>
              <Text style={styles.signatureLabel}>Должность:</Text>
              <View style={styles.signatureLine}>
                <Text>{settings.director_position || "Директор"}</Text>
              </View>
            </View>
            <View style={styles.signatureRow}>
              <Text style={styles.signatureLabel}>Подпись:</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>({settings.director_name || "____________"})</Text>
            </View>
            
            {/* Место для печати */}
            {settings.stamp_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={settings.stamp_url} style={styles.stampImage} />
            ) : (
              <View style={styles.stampPlaceholder}>
                <Text style={styles.stampText}>М.П.</Text>
              </View>
            )}
          </View>

          <View style={styles.signatureColumn}>
            <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 10 }}>Груз принял</Text>
            <View style={styles.signatureRow}>
              <Text style={styles.signatureLabel}>Должность:</Text>
              <View style={styles.signatureLine} />
            </View>
            <View style={styles.signatureRow}>
              <Text style={styles.signatureLabel}>Подпись:</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>(________________)</Text>
            </View>
            
            <View style={styles.stampPlaceholder}>
              <Text style={styles.stampText}>М.П.</Text>
            </View>
          </View>
        </View>

        {/* Нижний колонтитул */}
        <View style={styles.footer}>
          <Text>Документ создан в системе FinApp</Text>
          <Text>Страница 1 из 1</Text>
        </View>
      </Page>
    </Document>
  );
}
