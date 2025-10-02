"use client";
import { useMemo, useState } from "react";
import styles from "./Settings.module.css";
import { addCategory, renameCategory, deleteCategory } from "@/app/(protected)/settings/actions";

export type CategoryRecord = {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer";
  parent_id: string | null;
};

type TreeNode = {
  id: string;
  name: string;
  kind: CategoryRecord["kind"];
  parent_id: string | null;
  depth: number;
  children: TreeNode[];
};

const KIND_LABEL: Record<"expense" | "income", string> = {
  expense: "Расходы",
  income: "Доходы",
};

const KIND_ORDER: ("expense" | "income")[] = ["expense", "income"];

function buildTrees(categories: CategoryRecord[], kind: CategoryRecord["kind"]): TreeNode[] {
  const filtered = categories.filter((c) => c.kind === kind);
  const map = new Map<string, TreeNode>();
  for (const cat of filtered) {
    map.set(cat.id, { ...cat, depth: 0, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      const parent = map.get(node.parent_id)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      node.parent_id = null;
      node.depth = 0;
      roots.push(node);
    }
  }
  const sortFn = (a: TreeNode, b: TreeNode) => a.name.localeCompare(b.name, "ru");
  const sortTree = (items: TreeNode[]) => {
    items.sort(sortFn);
    for (const child of items) sortTree(child.children);
  };
  sortTree(roots);
  return roots;
}

function flattenOptions(tree: TreeNode[], excludeIds: Set<string> = new Set()): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (!excludeIds.has(node.id)) {
        const prefix = node.depth > 0 ? `${" ".repeat(node.depth)}• ` : "";
        result.push({ id: node.id, label: `${prefix}${node.name}` });
        walk(node.children);
      }
    }
  };
  walk(tree);
  return result;
}

export default function CategoriesManager({ categories }: { categories: CategoryRecord[] }) {
  const [tab, setTab] = useState<"expense" | "income">("expense");

  const treeByKind = useMemo(() => {
    return {
      expense: buildTrees(categories.filter((c) => c.kind !== "transfer"), "expense"),
      income: buildTrees(categories.filter((c) => c.kind !== "transfer"), "income"),
    };
  }, [categories]);

  const selectableByKind = useMemo(() => {
    const result = new Map<string, { id: string; label: string }[]>();
    for (const kind of KIND_ORDER) {
      const tree = treeByKind[kind];
      result.set(kind, flattenOptions(tree));
    }
    return result;
  }, [treeByKind]);

  const tree = treeByKind[tab];

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>Управление категориями</div>

      <div className={styles.toolbar}>
        {KIND_ORDER.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`${styles.tab} ${tab === kind ? styles.tabActive : ""}`}
            onClick={() => setTab(kind)}
          >
            {KIND_LABEL[kind]}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }} />
        <form action={addCategory} className={styles.itemForm}>
          <input type="hidden" name="kind" value={tab} />
          <input className={styles.input} name="name" placeholder="Новая категория" required />
          <select className={styles.select} name="parent_id" defaultValue="">
            <option value="">Без родителя</option>
            {(selectableByKind.get(tab) ?? []).map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button className={styles.btn} type="submit">Добавить</button>
        </form>
      </div>

      <div className={styles.tree}>
        {tree.length === 0 && <div style={{ color: "#888" }}>Пока нет категорий.</div>}
        {tree.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            allOptions={selectableByKind.get(tab) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function TreeRow({ node, allOptions }: { node: TreeNode; allOptions: { id: string; label: string }[] }) {
  const exclude = new Set<string>([node.id]);
  const options = allOptions.filter((opt) => !exclude.has(opt.id));
  return (
    <div className={styles.treeGroup}>
      <div className={styles.treeRow} style={{ marginLeft: node.depth * 20 }}>
        <div className={styles.treeInfo}>
          <span className="material-icons" aria-hidden style={{ fontSize: 18, opacity: 0.6 }}>
            folder
          </span>
          <span>{node.name}</span>
        </div>
        <div className={styles.treeActions}>
          <form action={renameCategory} className={styles.itemForm}>
            <input type="hidden" name="id" value={node.id} />
            <input className={styles.input} name="name" defaultValue={node.name} />
            <select className={styles.select} name="parent_id" defaultValue={node.parent_id ?? ""}>
              <option value="">Без родителя</option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button className={`${styles.btn} ${styles.btnSecondary}`} type="submit">Сохранить</button>
          </form>
          <form action={deleteCategory}>
            <input type="hidden" name="id" value={node.id} />
            <button type="submit" className={styles.del} title="Удалить">
              <span className="material-icons" aria-hidden>delete</span>
            </button>
          </form>
        </div>
      </div>
      {node.children.map((child) => (
        <TreeRow key={child.id} node={child} allOptions={allOptions} />
      ))}
    </div>
  );
}
