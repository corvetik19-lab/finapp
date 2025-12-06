"use client";
import { useMemo, useState, useTransition } from "react";
import { addCategory, renameCategory, deleteCategory } from "@/app/(protected)/settings/actions";
import { useToast, type ToastContextValue } from "@/components/toast/ToastContext";
import { Folder, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CategoryRecord = {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer" | "both";
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
  // Фильтруем категории: показываем категории с нужным kind или "both"
  const filtered = categories.filter((c) => c.kind === kind || c.kind === "both");
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
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

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

  const handleAddCategory = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await addCategory(formData);
        toast.show("Категория успешно добавлена", { type: "success" });
      } catch (error) {
        toast.show(error instanceof Error ? error.message : "Ошибка при добавлении категории", { type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Переключатель типа и форма добавления */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex gap-2">
          {KIND_ORDER.map((kind) => (
            <button
              key={kind}
              type="button"
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                tab === kind 
                  ? kind === "expense" 
                    ? "bg-red-500 text-white shadow-md" 
                    : "bg-green-500 text-white shadow-md"
                  : "bg-muted hover:bg-muted/80"
              )}
              onClick={() => setTab(kind)}
            >
              {kind === "expense" ? "💸 " : "💰 "}{KIND_LABEL[kind]}
            </button>
          ))}
        </div>
        
        <form action={handleAddCategory} className="flex items-center gap-2 flex-wrap lg:ml-auto">
          <Input className="w-44" name="name" placeholder="Название категории" required />
          <select className="h-10 px-3 border border-input bg-background rounded-md text-sm" name="kind" defaultValue={tab}>
            <option value="expense">Только расходы</option>
            <option value="income">Только доходы</option>
            <option value="both">Доходы и расходы</option>
          </select>
          <select className="h-10 px-3 border border-input bg-background rounded-md text-sm" name="parent_id" defaultValue="">
            <option value="">Без родителя</option>
            {(selectableByKind.get(tab) ?? []).map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={isPending}>
            {isPending ? "..." : "Добавить"}
          </Button>
        </form>
      </div>

      {/* Список категорий */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-3">Название</div>
            <div className="col-span-3">Переименовать</div>
            <div className="col-span-2">Тип</div>
            <div className="col-span-3">Родитель</div>
            <div className="col-span-1"></div>
          </div>
        </div>
        <div className="divide-y">
          {tree.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              Пока нет категорий. Добавьте первую!
            </div>
          )}
          {tree.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              allOptions={selectableByKind.get(tab) ?? []}
              toast={toast}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TreeRow({ node, allOptions, toast }: { node: TreeNode; allOptions: { id: string; label: string }[]; toast: ToastContextValue }) {
  const [isPending, startTransition] = useTransition();
  const exclude = new Set<string>([node.id]);
  const options = allOptions.filter((opt) => !exclude.has(opt.id));

  const handleRename = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await renameCategory(formData);
        toast.show("Категория успешно обновлена", { type: "success" });
      } catch (error) {
        toast.show(error instanceof Error ? error.message : "Ошибка при обновлении категории", { type: "error" });
      }
    });
  };

  const handleDelete = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await deleteCategory(formData);
        toast.show("Категория успешно удалена", { type: "success" });
      } catch (error) {
        toast.show(error instanceof Error ? error.message : "Ошибка при удалении категории", { type: "error" });
      }
    });
  };

  return (
    <>
      <div className="px-4 py-3 hover:bg-muted/30 transition-colors grid grid-cols-12 gap-2 items-center" style={{ paddingLeft: `${16 + node.depth * 24}px` }}>
        {/* Название */}
        <div className="col-span-3 flex items-center gap-2">
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <span className="font-medium truncate">{node.name}</span>
        </div>
        
        {/* Форма переименования */}
        <form action={handleRename} className="col-span-8 grid grid-cols-8 gap-2 items-center">
          <input type="hidden" name="id" value={node.id} />
          
          {/* Переименовать */}
          <div className="col-span-3">
            <Input className="h-9" name="name" defaultValue={node.name} />
          </div>
          
          {/* Тип */}
          <div className="col-span-2">
            <select className="w-full h-9 px-2 border border-input bg-background rounded-md text-sm" name="kind" defaultValue={node.kind}>
              <option value="expense">Расходы</option>
              <option value="income">Доходы</option>
              <option value="both">Оба</option>
            </select>
          </div>
          
          {/* Родитель */}
          <div className="col-span-2">
            <select className="w-full h-9 px-2 border border-input bg-background rounded-md text-sm" name="parent_id" defaultValue={node.parent_id ?? ""}>
              <option value="">—</option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Кнопка сохранения */}
          <div className="col-span-1 flex justify-end">
            <Button variant="ghost" size="sm" type="submit" disabled={isPending} className="h-8 px-2">
              {isPending ? "..." : "✓"}
            </Button>
          </div>
        </form>
        
        {/* Отдельная форма удаления */}
        <div className="col-span-1 flex justify-end">
          <form action={handleDelete}>
            <input type="hidden" name="id" value={node.id} />
            <Button variant="ghost" size="sm" type="submit" disabled={isPending} className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        </div>
      </div>
      {node.children.map((child) => (
        <TreeRow key={child.id} node={child} allOptions={allOptions} toast={toast} />
      ))}
    </>
  );
}
