import { notFound } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/server";
import { Debt, CLAIM_STAGE_LABELS } from "@/types/debt";
import { formatMoney } from "@/lib/utils/format";
import Link from "next/link";
import styles from "./page.module.css";

interface ClaimDetailPageProps {
  params: { id: string };
}

async function getClaim(id: string): Promise<Debt | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return data;
}

export default async function ClaimDetailPage({ params }: ClaimDetailPageProps) {
  const claim = await getClaim(params.id);
  
  if (!claim) {
    notFound();
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link href="/tenders/claims" className={styles.backLink}>
            ← Назад к списку претензий
          </Link>
        </div>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Детали претензии</h1>
          <div className={styles.stageBadge}>
            <span className={`${styles.stageIndicator} ${styles[`stage_${claim.stage}`]}`}>
              {CLAIM_STAGE_LABELS[claim.stage]}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainInfo}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>📋 Основная информация</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Тип</label>
                <span className={styles.infoValue}>
                  {claim.type === 'owe' ? 'Я должен' : 'Мне должны'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Должник/Кредитор</label>
                <span className={styles.infoValue}>{claim.creditor_debtor_name}</span>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Сумма долга</label>
                <span className={`${styles.infoValue} ${styles.amount}`}>
                  {formatMoney(claim.amount, claim.currency)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Валюта</label>
                <span className={styles.infoValue}>{claim.currency}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>📅 Даты</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Дата возникновения</label>
                <span className={styles.infoValue}>
                  {new Date(claim.date_created).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Срок возврата</label>
                <span className={styles.infoValue}>
                  {claim.date_due 
                    ? new Date(claim.date_due).toLocaleDateString('ru-RU')
                    : 'Не указан'
                  }
                </span>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Создано</label>
                <span className={styles.infoValue}>
                  {new Date(claim.created_at).toLocaleString('ru-RU')}
                </span>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Обновлено</label>
                <span className={styles.infoValue}>
                  {new Date(claim.updated_at).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
          </div>

          {(claim.tender_id || claim.application_number || claim.contract_number) && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>🏢 Данные тендера</h2>
              <div className={styles.infoGrid}>
                {claim.tender_id && (
                  <div className={styles.infoItem}>
                    <label className={styles.infoLabel}>ID Тендера</label>
                    <span className={styles.infoValue}>
                      {claim.tender_id.slice(0, 8)}...
                    </span>
                  </div>
                )}
                {claim.application_number && (
                  <div className={styles.infoItem}>
                    <label className={styles.infoLabel}>№ Заявки</label>
                    <span className={styles.infoValue}>{claim.application_number}</span>
                  </div>
                )}
                {claim.contract_number && (
                  <div className={styles.infoItem}>
                    <label className={styles.infoLabel}>№ Договора</label>
                    <span className={styles.infoValue}>{claim.contract_number}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {(claim.plaintiff || claim.defendant) && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>⚖️ Участники</h2>
              <div className={styles.infoGrid}>
                {claim.plaintiff && (
                  <div className={styles.infoItem}>
                    <label className={styles.infoLabel}>Истец</label>
                    <span className={styles.infoValue}>{claim.plaintiff}</span>
                  </div>
                )}
                {claim.defendant && (
                  <div className={styles.infoItem}>
                    <label className={styles.infoLabel}>Ответчик</label>
                    <span className={styles.infoValue}>{claim.defendant}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>💰 Статус платежей</h2>
            <div className={styles.paymentStatus}>
              <div className={styles.paymentItem}>
                <label>Сумма долга:</label>
                <span className={styles.totalAmount}>
                  {formatMoney(claim.amount, claim.currency)}
                </span>
              </div>
              <div className={styles.paymentItem}>
                <label>Оплачено:</label>
                <span className={styles.paidAmount}>
                  {formatMoney(claim.amount_paid || 0, claim.currency)}
                </span>
              </div>
              <div className={styles.paymentItem}>
                <label>Остаток:</label>
                <span className={styles.remainingAmount}>
                  {formatMoney((claim.amount || 0) - (claim.amount_paid || 0), claim.currency)}
                </span>
              </div>
              <div className={styles.paymentProgress}>
                <div 
                  className={styles.progressBar}
                  style={{
                    width: `${Math.min(100, ((claim.amount_paid || 0) / (claim.amount || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {claim.description && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>📝 Описание</h2>
              <p className={styles.description}>{claim.description}</p>
            </div>
          )}

          {claim.comments && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>💬 Комментарии</h2>
              <p className={styles.comments}>{claim.comments}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
