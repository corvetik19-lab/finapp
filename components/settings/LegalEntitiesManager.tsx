"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./LegalEntitiesManager.module.css";

interface LegalEntity {
  id: string;
  full_name: string;
  short_name: string | null;
  legal_form: string | null;
  inn: string;
  kpp: string | null;
  ogrn: string | null;
  okpo: string | null;
  okved: string | null;
  registration_date: string | null;
  legal_address: string | null;
  actual_address: string | null;
  bank_name: string | null;
  bank_bik: string | null;
  bank_account: string | null;
  bank_corr_account: string | null;
  director_name: string | null;
  director_position: string | null;
  director_basis: string | null;
  accountant_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_system: string | null;
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
}

interface Props {
  initialEntities: LegalEntity[];
}

const LEGAL_FORMS = ["ООО", "ИП", "АО", "ПАО", "НКО", "Другое"];
const TAX_SYSTEMS = [
  { value: "osno", label: "ОСНО" },
  { value: "usn_income", label: "УСН (Доходы)" },
  { value: "usn_income_expense", label: "УСН (Доходы-Расходы)" },
  { value: "patent", label: "Патент" },
  { value: "npd", label: "НПД" },
];

const emptyForm = {
  full_name: "", short_name: "", inn: "", kpp: "", ogrn: "", okpo: "", okved: "",
  registration_date: "", legal_address: "", actual_address: "",
  bank_name: "", bank_bik: "", bank_account: "", bank_corr_account: "",
  director_name: "", director_position: "Генеральный директор", director_basis: "Устава",
  accountant_name: "", phone: "", email: "", website: "",
  legal_form: "ООО", tax_system: "osno", is_default: false, is_active: true, notes: "",
};

export function LegalEntitiesManager({ initialEntities }: Props) {
  const router = useRouter();
  const [entities, setEntities] = useState<LegalEntity[]>(initialEntities);
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editing, setEditing] = useState<LegalEntity | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"main" | "address" | "bank" | "contacts">("main");
  const [error, setError] = useState("");

  useEffect(() => { setEntities(initialEntities); }, [initialEntities]);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/legal-entities");
    if (res.ok) setEntities(await res.json());
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setTab("main");
    setError("");
    setIsOpen(true);
  };

  const openEdit = (e: LegalEntity) => {
    setEditing(e);
    setForm({
      full_name: e.full_name || "", short_name: e.short_name || "", inn: e.inn || "",
      kpp: e.kpp || "", ogrn: e.ogrn || "", okpo: e.okpo || "", okved: e.okved || "",
      registration_date: e.registration_date || "", legal_address: e.legal_address || "",
      actual_address: e.actual_address || "", bank_name: e.bank_name || "",
      bank_bik: e.bank_bik || "", bank_account: e.bank_account || "",
      bank_corr_account: e.bank_corr_account || "", director_name: e.director_name || "",
      director_position: e.director_position || "", director_basis: e.director_basis || "",
      accountant_name: e.accountant_name || "", phone: e.phone || "", email: e.email || "",
      website: e.website || "", legal_form: e.legal_form || "", tax_system: e.tax_system || "",
      is_default: e.is_default, is_active: e.is_active, notes: e.notes || "",
    });
    setTab("main");
    setError("");
    setIsOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) { setError("Укажите наименование"); return; }
    if (!form.inn || form.inn.length < 10) { setError("ИНН должен быть 10-12 цифр"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/legal-entities/${editing.id}` : "/api/legal-entities";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Ошибка");
      const saved = await res.json();
      if (editing) setEntities(p => p.map(x => x.id === saved.id ? saved : x));
      else setEntities(p => [saved, ...p]);
      setIsOpen(false);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  };

  const remove = async (e: LegalEntity) => {
    if (!confirm(`Удалить "${e.short_name || e.full_name}"?`)) return;
    await fetch(`/api/legal-entities/${e.id}`, { method: "DELETE" });
    setEntities(p => p.filter(x => x.id !== e.id));
    router.refresh();
  };

  const setDefault = async (e: LegalEntity) => {
    await fetch(`/api/legal-entities/${e.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    loadData();
  };

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🏢 Юридические лица</h1>
          <p className={styles.subtitle}>Реквизиты организаций для документов</p>
        </div>
        <button className={styles.addBtn} onClick={openCreate}>
          <span className="material-icons">add</span>Добавить
        </button>
      </div>

      {entities.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🏢</div>
          <h3>Нет юридических лиц</h3>
          <p>Добавьте первое юр. лицо</p>
          <button className={styles.emptyBtn} onClick={openCreate}>
            <span className="material-icons">add</span>Добавить
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {entities.map(e => (
            <div key={e.id} className={`${styles.card} ${e.is_default ? styles.cardDefault : ""}`}>
              {e.is_default && <div className={styles.badge}><span className="material-icons">star</span>По умолчанию</div>}
              <div className={styles.cardHead}>
                <div className={styles.logo}>{(e.short_name || e.full_name).charAt(0)}</div>
                <div>
                  <h3 className={styles.cardTitle}>{e.short_name || e.full_name}</h3>
                  {e.short_name && <p className={styles.cardSub}>{e.full_name}</p>}
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.row}><span>ИНН</span><span>{e.inn}</span></div>
                {e.kpp && <div className={styles.row}><span>КПП</span><span>{e.kpp}</span></div>}
                {e.ogrn && <div className={styles.row}><span>ОГРН</span><span>{e.ogrn}</span></div>}
                {e.director_name && <div className={styles.row}><span>Руководитель</span><span>{e.director_name}</span></div>}
              </div>
              <div className={styles.cardActions}>
                {!e.is_default && <button onClick={() => setDefault(e)} title="По умолчанию"><span className="material-icons">star_outline</span></button>}
                <button onClick={() => openEdit(e)} title="Редактировать"><span className="material-icons">edit</span></button>
                <button onClick={() => remove(e)} title="Удалить" className={styles.delBtn}><span className="material-icons">delete</span></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={`${styles.modal} ${isFullscreen ? styles.modalFull : ""}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2>{editing ? "Редактирование" : "Новое юр. лицо"}</h2>
              <div>
                <button onClick={() => setIsFullscreen(!isFullscreen)}><span className="material-icons">{isFullscreen ? "fullscreen_exit" : "fullscreen"}</span></button>
                <button onClick={() => setIsOpen(false)}><span className="material-icons">close</span></button>
              </div>
            </div>
            <div className={styles.tabs}>
              <button className={tab === "main" ? styles.tabActive : ""} onClick={() => setTab("main")}><span className="material-icons">business</span>Основное</button>
              <button className={tab === "address" ? styles.tabActive : ""} onClick={() => setTab("address")}><span className="material-icons">location_on</span>Адреса</button>
              <button className={tab === "bank" ? styles.tabActive : ""} onClick={() => setTab("bank")}><span className="material-icons">account_balance</span>Банк</button>
              <button className={tab === "contacts" ? styles.tabActive : ""} onClick={() => setTab("contacts")}><span className="material-icons">contacts</span>Контакты</button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.error}><span className="material-icons">error</span>{error}</div>}
              {tab === "main" && (
                <>
                  <div className={styles.field}><label>Полное наименование *</label><input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder='ООО "Название"' /></div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>Краткое</label><input value={form.short_name} onChange={e => set("short_name", e.target.value)} /></div>
                    <div className={styles.field}><label>Форма</label><select value={form.legal_form} onChange={e => set("legal_form", e.target.value)}>{LEGAL_FORMS.map(f => <option key={f}>{f}</option>)}</select></div>
                  </div>
                  <div className={styles.section}>Регистрация</div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>ИНН *</label><input value={form.inn} onChange={e => set("inn", e.target.value.replace(/\D/g, "").slice(0, 12))} maxLength={12} /></div>
                    <div className={styles.field}><label>КПП</label><input value={form.kpp} onChange={e => set("kpp", e.target.value.replace(/\D/g, "").slice(0, 9))} maxLength={9} /></div>
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>ОГРН</label><input value={form.ogrn} onChange={e => set("ogrn", e.target.value.replace(/\D/g, "").slice(0, 15))} maxLength={15} /></div>
                    <div className={styles.field}><label>ОКПО</label><input value={form.okpo} onChange={e => set("okpo", e.target.value.replace(/\D/g, "").slice(0, 14))} maxLength={14} /></div>
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>ОКВЭД</label><input value={form.okved} onChange={e => set("okved", e.target.value)} /></div>
                    <div className={styles.field}><label>Дата регистрации</label><input type="date" value={form.registration_date} onChange={e => set("registration_date", e.target.value)} /></div>
                  </div>
                  <div className={styles.field}><label>Система налогообложения</label><select value={form.tax_system} onChange={e => set("tax_system", e.target.value)}>{TAX_SYSTEMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                  <div className={styles.section}>Руководство</div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>ФИО руководителя</label><input value={form.director_name} onChange={e => set("director_name", e.target.value)} /></div>
                    <div className={styles.field}><label>Должность</label><input value={form.director_position} onChange={e => set("director_position", e.target.value)} /></div>
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>Действует на основании</label><input value={form.director_basis} onChange={e => set("director_basis", e.target.value)} /></div>
                    <div className={styles.field}><label>Гл. бухгалтер</label><input value={form.accountant_name} onChange={e => set("accountant_name", e.target.value)} /></div>
                  </div>
                  <div className={styles.checkRow}>
                    <label><input type="checkbox" checked={form.is_default} onChange={e => set("is_default", e.target.checked)} />По умолчанию</label>
                    <label><input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} />Активно</label>
                  </div>
                </>
              )}
              {tab === "address" && (
                <>
                  <div className={styles.section}>Юридический адрес</div>
                  <div className={styles.field}><label>Адрес</label><textarea value={form.legal_address} onChange={e => set("legal_address", e.target.value)} rows={2} /></div>
                  <div className={styles.section}>Фактический адрес</div>
                  <div className={styles.field}><label>Адрес</label><textarea value={form.actual_address} onChange={e => set("actual_address", e.target.value)} rows={2} /></div>
                  <button type="button" className={styles.copyBtn} onClick={() => set("actual_address", form.legal_address)}><span className="material-icons">content_copy</span>Скопировать юр. адрес</button>
                </>
              )}
              {tab === "bank" && (
                <>
                  <div className={styles.field}><label>Банк</label><input value={form.bank_name} onChange={e => set("bank_name", e.target.value)} placeholder='ПАО "Сбербанк"' /></div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>БИК</label><input value={form.bank_bik} onChange={e => set("bank_bik", e.target.value.replace(/\D/g, "").slice(0, 9))} maxLength={9} /></div>
                    <div className={styles.field}><label>К/с</label><input value={form.bank_corr_account} onChange={e => set("bank_corr_account", e.target.value.replace(/\D/g, "").slice(0, 20))} maxLength={20} /></div>
                  </div>
                  <div className={styles.field}><label>Расчётный счёт</label><input value={form.bank_account} onChange={e => set("bank_account", e.target.value.replace(/\D/g, "").slice(0, 20))} maxLength={20} /></div>
                </>
              )}
              {tab === "contacts" && (
                <>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>Телефон</label><input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+7 (999) 123-45-67" /></div>
                    <div className={styles.field}><label>Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
                  </div>
                  <div className={styles.field}><label>Сайт</label><input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://" /></div>
                  <div className={styles.field}><label>Примечания</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} /></div>
                </>
              )}
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setIsOpen(false)}>Отмена</button>
              <button className={styles.saveBtn} onClick={save} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
