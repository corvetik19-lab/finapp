"use client";

import styles from "./finance-settings.module.css";

interface Category {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

interface PlanType {
  id: string;
  name: string;
  description?: string;
}

interface PlanPreset {
  id: string;
  name: string;
  description?: string;
  plan_type_id: string;
}

interface Props {
  categories: Category[];
  planTypes: PlanType[];
  planPresets: PlanPreset[];
}

export default function FinanceSettingsClient({
  categories,
  planTypes,
  planPresets,
}: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Настройки режима &quot;Финансы&quot;</h1>
        <p>Управление категориями, планами и параметрами финансового учёта</p>
      </div>

      {/* Категории */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Категории</h2>
          <button className={styles.addButton}>
            <span className="material-icons">add</span>
            Добавить категорию
          </button>
        </div>
        <p className={styles.sectionDescription}>
          Всего категорий: {categories.length}
        </p>
        <div className={styles.categoriesList}>
          {categories.slice(0, 6).map((category) => (
            <div key={category.id} className={styles.categoryCard}>
              <span className="material-icons">{category.icon || "category"}</span>
              <div>
                <div className={styles.categoryName}>{category.name}</div>
                <div className={styles.categoryType}>
                  {category.type === "income" ? "Доход" : "Расход"}
                </div>
              </div>
            </div>
          ))}
        </div>
        {categories.length > 6 && (
          <p className={styles.moreInfo}>И ещё {categories.length - 6} категорий...</p>
        )}
      </section>

      {/* Справочник товаров */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Справочник товаров</h2>
          <a href="/finance/settings/products" className={styles.linkButton}>
            <span className="material-icons">shopping_cart</span>
            Управление товарами
          </a>
        </div>
        <p className={styles.sectionDescription}>
          Добавьте товары и позиции, которые вы часто покупаете. При создании транзакции вы сможете быстро выбрать их из списка с автодополнением.
        </p>
      </section>

      {/* Быстрые пресеты */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Быстрые транзакции</h2>
          <a href="/finance/settings/quick-presets" className={styles.linkButton}>
            <span className="material-icons">bolt</span>
            Управление пресетами
          </a>
        </div>
        <p className={styles.sectionDescription}>
          Настройте быстрые пресеты для мгновенного добавления часто повторяющихся транзакций одним кликом.
        </p>
      </section>

      {/* Типы планов */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Типы планов</h2>
          <button className={styles.addButton}>
            <span className="material-icons">add</span>
            Добавить тип
          </button>
        </div>
        <p className={styles.sectionDescription}>
          Всего типов: {planTypes.length}
        </p>
        <div className={styles.planTypesList}>
          {planTypes.map((planType) => (
            <div key={planType.id} className={styles.planTypeCard}>
              <span className="material-icons">flag</span>
              <div>
                <div className={styles.planTypeName}>{planType.name}</div>
                {planType.description && (
                  <div className={styles.planTypeDescription}>
                    {planType.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Пресеты планов */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Пресеты планов</h2>
          <button className={styles.addButton}>
            <span className="material-icons">add</span>
            Добавить пресет
          </button>
        </div>
        <p className={styles.sectionDescription}>
          Всего пресетов: {planPresets.length}
        </p>
        <div className={styles.presetsList}>
          {planPresets.map((preset) => (
            <div key={preset.id} className={styles.presetCard}>
              <span className="material-icons">bookmark</span>
              <div>
                <div className={styles.presetName}>{preset.name}</div>
                {preset.description && (
                  <div className={styles.presetDescription}>
                    {preset.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
