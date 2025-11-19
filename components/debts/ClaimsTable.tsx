"use client";

import { Debt, CLAIM_STAGE_LABELS, ClaimStage } from "@/types/debt";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateDebt, deleteDebt } from "@/lib/debts/service";
import { formatMoney } from "@/lib/utils/format";
import styles from "./ClaimsTable.module.css";

interface ClaimsTableProps {
  initialDebts: Debt[];
}

export function ClaimsTable({ initialDebts }: ClaimsTableProps) {
  const router = useRouter();
  const [debts, setDebts] = useState(initialDebts);
  const [filter, setFilter] = useState<ClaimStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [plaintiffFilter, setPlaintiffFilter] = useState('');
  const [defendantFilter, setDefendantFilter] = useState('');

  useEffect(() => {
    setDebts(initialDebts);
  }, [initialDebts]);

  const filteredDebts = debts.filter(debt => {
    // Фильтр по этапу
    if (filter !== 'all' && debt.stage !== filter) return false;
    
    // Фильтр по истцу
    if (plaintiffFilter && !debt.plaintiff?.toLowerCase().includes(plaintiffFilter.toLowerCase())) {
      return false;
    }
    
    // Фильтр по ответчику
    if (defendantFilter && !debt.defendant?.toLowerCase().includes(defendantFilter.toLowerCase())) {
      return false;
    }
    
    // Поиск по всем текстовым полям
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        debt.creditor_debtor_name?.toLowerCase().includes(query) ||
        debt.application_number?.toLowerCase().includes(query) ||
        debt.contract_number?.toLowerCase().includes(query) ||
        debt.plaintiff?.toLowerCase().includes(query) ||
        debt.defendant?.toLowerCase().includes(query) ||
        debt.comments?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту претензию?')) return;
    try {
      await deleteDebt(id);
      setDebts(prev => prev.filter(d => d.id !== id));
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при удалении');
    }
  };

  const handleStageChange = async (debt: Debt, newStage: ClaimStage) => {
    try {
      const updated = await updateDebt(debt.id, { stage: newStage });
      setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при изменении этапа');
    }
  };

  // Подсчёт количества претензий по этапам
  const stageCounts = debts.reduce((acc, debt) => {
    acc[debt.stage] = (acc[debt.stage] || 0) + 1;
    return acc;
  }, {} as Record<ClaimStage, number>);

  return (
    <div className={styles.container}>
      {/* Табы фильтрации */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`}
          onClick={() => setFilter('all')}
        >
          Все записи о претензиях
          {debts.length > 0 && <span className={styles.badge}>{debts.length}</span>}
        </button>
        <button
          className={`${styles.tab} ${filter === 'new' ? styles.activeTab : ''}`}
          onClick={() => setFilter('new')}
        >
          {CLAIM_STAGE_LABELS.new}
          {stageCounts.new > 0 && <span className={styles.badge}>{stageCounts.new}</span>}
        </button>
        <button
          className={`${styles.tab} ${filter === 'claim' ? styles.activeTab : ''}`}
          onClick={() => setFilter('claim')}
        >
          {CLAIM_STAGE_LABELS.claim}
          {stageCounts.claim > 0 && <span className={styles.badge}>{stageCounts.claim}</span>}
        </button>
        <button
          className={`${styles.tab} ${filter === 'court' ? styles.activeTab : ''}`}
          onClick={() => setFilter('court')}
        >
          {CLAIM_STAGE_LABELS.court}
          {stageCounts.court > 0 && <span className={styles.badge}>{stageCounts.court}</span>}
        </button>
        <button
          className={`${styles.tab} ${filter === 'writ' ? styles.activeTab : ''}`}
          onClick={() => setFilter('writ')}
        >
          {CLAIM_STAGE_LABELS.writ}
          {stageCounts.writ > 0 && <span className={styles.badge}>{stageCounts.writ}</span>}
        </button>
        <button
          className={`${styles.tab} ${filter === 'bailiff' ? styles.activeTab : ''}`}
          onClick={() => setFilter('bailiff')}
        >
          {CLAIM_STAGE_LABELS.bailiff}
          {stageCounts.bailiff > 0 && <span className={styles.badge}>{stageCounts.bailiff}</span>}
        </button>
        <button
          className={`${styles.tab} ${filter === 'paid' ? styles.activeTab : ''}`}
          onClick={() => setFilter('paid')}
        >
          {CLAIM_STAGE_LABELS.paid}
          {stageCounts.paid > 0 && <span className={styles.badge}>{stageCounts.paid}</span>}
        </button>
      </div>

      {/* Панель управления */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button
          className={styles.filterBtn}
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className="material-icons">filter_list</span>
          {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
        </button>
      </div>

      {/* Дополнительные фильтры */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className="material-icons">gavel</span>
              Истец
            </label>
            <input
              type="text"
              placeholder="Фильтр по истцу..."
              value={plaintiffFilter}
              onChange={(e) => setPlaintiffFilter(e.target.value)}
              className={styles.filterInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className="material-icons">person</span>
              Ответчик
            </label>
            <input
              type="text"
              placeholder="Фильтр по ответчику..."
              value={defendantFilter}
              onChange={(e) => setDefendantFilter(e.target.value)}
              className={styles.filterInput}
            />
          </div>
          {(plaintiffFilter || defendantFilter) && (
            <button
              className={styles.clearFiltersBtn}
              onClick={() => {
                setPlaintiffFilter('');
                setDefendantFilter('');
              }}
            >
              <span className="material-icons">clear</span>
              Очистить фильтры
            </button>
          )}
        </div>
      )}

      {/* Таблица */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>№ Тендера</th>
              <th>№ Заявки</th>
              <th>Истец</th>
              <th>Ответчик</th>
              <th>Основной долг</th>
              <th>№ Договора</th>
              <th>Этап</th>
              <th>Комментарии</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredDebts.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.empty}>
                  {searchQuery ? 'Ничего не найдено' : 'Нет претензий'}
                </td>
              </tr>
            ) : (
              filteredDebts.map((debt, index) => (
                <tr key={debt.id} className={styles.row}>
                  <td className={styles.idCell}>{index + 1}</td>
                  <td>{debt.tender?.purchase_number || '—'}</td>
                  <td>{debt.application_number || '—'}</td>
                  <td>{debt.plaintiff || '—'}</td>
                  <td className={styles.defendant}>{debt.defendant || debt.creditor_debtor_name}</td>
                  <td className={styles.amount}>
                    {formatMoney(debt.amount, debt.currency)}
                  </td>
                  <td>{debt.contract_number || '—'}</td>
                  <td>
                    <select
                      value={debt.stage}
                      onChange={(e) => handleStageChange(debt, e.target.value as ClaimStage)}
                      className={`${styles.stageSelect} ${styles[`stage_${debt.stage}`]}`}
                    >
                      <option value="new">{CLAIM_STAGE_LABELS.new}</option>
                      <option value="claim">{CLAIM_STAGE_LABELS.claim}</option>
                      <option value="court">{CLAIM_STAGE_LABELS.court}</option>
                      <option value="writ">{CLAIM_STAGE_LABELS.writ}</option>
                      <option value="bailiff">{CLAIM_STAGE_LABELS.bailiff}</option>
                      <option value="paid">{CLAIM_STAGE_LABELS.paid}</option>
                    </select>
                  </td>
                  <td className={styles.comments}>
                    {debt.comments ? (
                      <span title={debt.comments}>
                        {debt.comments.length > 30 ? `${debt.comments.slice(0, 30)}...` : debt.comments}
                      </span>
                    ) : '—'}
                  </td>
                  <td className={styles.actions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => router.push(`/tenders/claims/${debt.id}`)}
                      title="Открыть"
                    >
                      <span className="material-icons">visibility</span>
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleDelete(debt.id)}
                      title="Удалить"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      <div className={styles.pagination}>
        <span className={styles.paginationInfo}>
          Строк на странице: 10
        </span>
        <span className={styles.paginationInfo}>
          0 - 0 из 0
        </span>
        <div className={styles.paginationButtons}>
          <button disabled className={styles.paginationBtn}>
            <span className="material-icons">first_page</span>
          </button>
          <button disabled className={styles.paginationBtn}>
            <span className="material-icons">chevron_left</span>
          </button>
          <span className={styles.pageNumber}>1</span>
          <button disabled className={styles.paginationBtn}>
            <span className="material-icons">chevron_right</span>
          </button>
          <button disabled className={styles.paginationBtn}>
            <span className="material-icons">last_page</span>
          </button>
        </div>
      </div>
    </div>
  );
}
