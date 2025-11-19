"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shipmentFormSchema, type ShipmentFormInput } from "@/lib/logistics/validation";
import { SHIPMENT_TYPE_LABELS, Driver } from "@/types/logistics";
import { useState, useEffect } from "react";
import styles from "./ShipmentFormModal.module.css";

interface ShipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ShipmentFormInput) => Promise<void>;
  isSubmitting: boolean;
}

export function ShipmentFormModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  isSubmitting 
}: ShipmentFormModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShipmentFormInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(shipmentFormSchema) as any,
    defaultValues: {
      type: 'standard',
      currency: 'RUB',
      sender_country: 'Россия',
      recipient_country: 'Россия',
      cost_amount: 0,
    }
  });

  useEffect(() => {
    if (isOpen) {
      // Загружаем список водителей через API
      fetch('/api/logistics/drivers')
        .then(res => res.json())
        .then(setDrivers)
        .catch(console.error);
      reset();
    }
  }, [isOpen, reset]);

  const handleFormSubmit: SubmitHandler<ShipmentFormInput> = async (data) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Ошибка при создании отправки');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>📦 Новая отправка</h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className={styles.form}>
          {/* Тип отправки */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Тип доставки</h3>
            <div className={styles.radioGroup}>
              {Object.entries(SHIPMENT_TYPE_LABELS).map(([type, label]) => (
                <label key={type} className={styles.radioLabel}>
                  <input 
                    type="radio" 
                    value={type} 
                    {...register('type')} 
                    className={styles.radioInput} 
                  />
                  <span className={styles.radioCustom}></span>
                  {label}
                  {type === 'express' && <span className={styles.typeBadge}>⚡ Быстро</span>}
                  {type === 'overnight' && <span className={styles.typeBadge}>🌙 За ночь</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Отправитель */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📤 Отправитель</h3>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Имя / Организация *</label>
                <input {...register('sender_name')} className={styles.input} />
                {errors.sender_name && <span className={styles.errorText}>{errors.sender_name.message}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Компания</label>
                <input {...register('sender_company')} placeholder="ООО 'Компания'" className={styles.input} />
              </div>
            </div>
            
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Телефон</label>
                <input {...register('sender_phone')} type="tel" placeholder="+7 (999) 123-45-67" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input {...register('sender_email')} type="email" className={styles.input} />
              </div>
            </div>

            <div className={styles.addressSection}>
              <h4 className={styles.addressTitle}>Адрес отправителя</h4>
              <div className={styles.formGroup}>
                <label className={styles.label}>Улица, дом *</label>
                <input {...register('sender_street')} placeholder="ул. Ленина, д. 1" className={styles.input} />
                {errors.sender_street && <span className={styles.errorText}>{errors.sender_street.message}</span>}
              </div>
              
              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Город *</label>
                  <input {...register('sender_city')} placeholder="Москва" className={styles.input} />
                  {errors.sender_city && <span className={styles.errorText}>{errors.sender_city.message}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Регион</label>
                  <input {...register('sender_region')} placeholder="Московская область" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Индекс</label>
                  <input {...register('sender_postal_code')} placeholder="123456" className={styles.input} />
                </div>
              </div>
            </div>
          </div>

          {/* Получатель */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📥 Получатель</h3>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Имя / Организация *</label>
                <input {...register('recipient_name')} className={styles.input} />
                {errors.recipient_name && <span className={styles.errorText}>{errors.recipient_name.message}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Компания</label>
                <input {...register('recipient_company')} className={styles.input} />
              </div>
            </div>
            
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Телефон</label>
                <input {...register('recipient_phone')} type="tel" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input {...register('recipient_email')} type="email" className={styles.input} />
              </div>
            </div>

            <div className={styles.addressSection}>
              <h4 className={styles.addressTitle}>Адрес получателя</h4>
              <div className={styles.formGroup}>
                <label className={styles.label}>Улица, дом *</label>
                <input {...register('recipient_street')} className={styles.input} />
                {errors.recipient_street && <span className={styles.errorText}>{errors.recipient_street.message}</span>}
              </div>
              
              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Город *</label>
                  <input {...register('recipient_city')} className={styles.input} />
                  {errors.recipient_city && <span className={styles.errorText}>{errors.recipient_city.message}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Регион</label>
                  <input {...register('recipient_region')} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Индекс</label>
                  <input {...register('recipient_postal_code')} className={styles.input} />
                </div>
              </div>
            </div>
          </div>

          {/* Груз */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📦 Информация о грузе</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>Описание груза *</label>
              <textarea {...register('description')} rows={3} placeholder="Документы, оборудование, товары..." className={styles.textarea} />
              {errors.description && <span className={styles.errorText}>{errors.description.message}</span>}
            </div>
            
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Вес (кг)</label>
                <input {...register('weight_kg', { valueAsNumber: true })} type="number" step="0.1" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Длина (см)</label>
                <input {...register('length_cm', { valueAsNumber: true })} type="number" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ширина (см)</label>
                <input {...register('width_cm', { valueAsNumber: true })} type="number" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Высота (см)</label>
                <input {...register('height_cm', { valueAsNumber: true })} type="number" className={styles.input} />
              </div>
            </div>
            
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Объявленная стоимость (₽)</label>
                <input {...register('value_amount', { valueAsNumber: true })} type="number" step="0.01" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Стоимость доставки (₽) *</label>
                <input {...register('cost_amount', { valueAsNumber: true })} type="number" step="0.01" className={styles.input} />
                {errors.cost_amount && <span className={styles.errorText}>{errors.cost_amount.message}</span>}
              </div>
            </div>
          </div>

          {/* Даты и исполнители */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📅 Сроки и исполнители</h3>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Дата забора</label>
                <input {...register('pickup_date')} type="date" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Планируемая доставка</label>
                <input {...register('estimated_delivery')} type="date" className={styles.input} />
              </div>
            </div>
            
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Водитель</label>
                <select {...register('driver_id')} className={styles.select}>
                  <option value="">Выберите водителя</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} {driver.vehicle_info?.number && `(${driver.vehicle_info.number})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Курьерская служба</label>
                <input {...register('courier_company')} placeholder="СДЭК, Почта России..." className={styles.input} />
              </div>
            </div>
          </div>

          {/* Дополнительно */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📝 Дополнительная информация</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>Особые указания</label>
              <textarea {...register('special_instructions')} rows={2} placeholder="Хрупкое, осторожно..." className={styles.textarea} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Заметки</label>
              <textarea {...register('notes')} rows={2} className={styles.textarea} />
            </div>
          </div>

          {/* Кнопки */}
          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Отмена
            </button>
            <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}></span>
                  Создаём...
                </>
              ) : (
                'Создать отправку'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
