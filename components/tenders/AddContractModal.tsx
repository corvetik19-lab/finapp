'use client';

import { useState, useEffect } from 'react';
import type { Tender } from '@/lib/tenders/types';
import styles from './AddContractModal.module.css';

interface AddContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tender: Tender) => void;
  companyId: string;
}

export function AddContractModal({ isOpen, onClose, onSelect, companyId }: AddContractModalProps) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadReadyTenders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, companyId]);

  const loadReadyTenders = async () => {
    try {
      setLoading(true);
      
      // Загружаем все этапы
      const stagesResponse = await fetch(`/api/tenders/stages?company_id=${companyId}`);
      if (!stagesResponse.ok) throw new Error('Ошибка загрузки этапов');
      
      const stagesData = await stagesResponse.json();
      const allStages = stagesData.data || [];
      
      // Находим этапы "Договор подписан. Ждём заключения"
      const readyStages = allStages.filter((stage: { name: string; id: string }) => 
        stage.name === 'Договор подписан. Ждём заключения' || 
        stage.name === 'ЗМО: Договор подписан. Ждём заключения'
      );
      
      if (readyStages.length === 0) {
        setTenders([]);
        return;
      }
      
      const stageIds = readyStages.map((s: { id: string }) => s.id);
      
      // Загружаем тендеры из этих этапов
      const params = new URLSearchParams({
        company_id: companyId,
        limit: '1000',
      });
      
      const tendersResponse = await fetch(`/api/tenders?${params}`);
      if (!tendersResponse.ok) throw new Error('Ошибка загрузки тендеров');
      
      const tendersData = await tendersResponse.json();
      const allTenders = tendersData || [];
      
      // Фильтруем только тендеры из нужных этапов
      const filteredTenders = allTenders.filter((t: Tender) => 
        stageIds.includes(t.stage_id)
      );
      
      setTenders(filteredTenders);
    } catch (error) {
      console.error('Error loading ready tenders:', error);
      setTenders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTenders = tenders.filter(tender =>
    tender.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tender.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tender.purchase_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Добавить контракт в реализацию</h2>
            <p className={styles.modalSubtitle}>
              Выберите закупку из этапа &quot;Договор подписан. Ждём заключения&quot;
            </p>
          </div>
          <button onClick={onClose} className={styles.closeButton} aria-label="Закрыть">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Поиск */}
        <div className={styles.searchContainer}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Поиск по заказчику, предмету или номеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className={styles.clearButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Список тендеров */}
        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.spinner}></div>
              <p>Загрузка...</p>
            </div>
          ) : filteredTenders.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
              <h3>Нет закупок для добавления</h3>
              <p>
                {searchQuery 
                  ? 'По вашему запросу ничего не найдено' 
                  : 'Нет закупок на этапе "Договор подписан. Ждём заключения"'
                }
              </p>
            </div>
          ) : (
            <div className={styles.tendersList}>
              {filteredTenders.map((tender) => (
                <div
                  key={tender.id}
                  className={styles.tenderCard}
                  onClick={() => onSelect(tender)}
                >
                  <div className={styles.tenderCardHeader}>
                    <div className={styles.tenderCustomer}>{tender.customer}</div>
                    {tender.type?.name && (
                      <span className={styles.tenderBadge}>{tender.type.name}</span>
                    )}
                  </div>
                  
                  <div className={styles.tenderSubject}>{tender.subject}</div>
                  
                  <div className={styles.tenderInfo}>
                    <div className={styles.tenderInfoItem}>
                      <span className={styles.tenderInfoLabel}>НМЦК:</span>
                      <span className={styles.tenderInfoValue}>
                        {(tender.nmck / 100).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    {tender.contract_price && tender.contract_price > 0 && (
                      <div className={styles.tenderInfoItem}>
                        <span className={styles.tenderInfoLabel}>Цена контракта:</span>
                        <span className={styles.tenderInfoValue}>
                          {(tender.contract_price / 100).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.tenderFooter}>
                    <div className={styles.tenderNumber}>
                      № ЕИС {tender.purchase_number}
                    </div>
                    {tender.platform && (
                      <div className={styles.tenderPlatform}>
                        {tender.platform}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.selectIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.btnSecondary}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
