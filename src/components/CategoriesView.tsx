import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  FolderKanban,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';
import { Category, Expense, UserProfile } from '../types/finance';
import { CATEGORY_COLORS } from '../utils/storage';

interface CategoriesViewProps {
  currentUser: UserProfile;
  categories: Category[];
  expenses: Expense[];
  onSaveCategory: (
    name: string,
    color: string,
    categoryId?: string
  ) => { ok: true } | { ok: false; error: string };
  onDeleteCategory: (
    categoryId: string
  ) => { ok: true } | { ok: false; error: string };
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  currentUser,
  categories,
  expenses,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const userCategories = categories.filter((c) => c.ownerId === currentUser.id);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[2]);
  const [error, setError] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(CATEGORY_COLORS[2]);
  const [editError, setEditError] = useState('');

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const onPointerDown = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onSaveCategory(newName, newColor);
    if (!res.ok) {
      setError(res.error);
      setShakeTrigger((n) => n + 1);
      return;
    }
    setNewName('');
    setError('');
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditError('');
  };

  const handleSaveEdit = (catId: string) => {
    const res = onSaveCategory(editName, editColor, catId);
    if (!res.ok) {
      setEditError(res.error);
      setShakeTrigger((n) => n + 1);
      return;
    }
    setEditingId(null);
    setEditError('');
  };

  return (
    <div className="animate-enter space-y-6">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md">
        <div className="flex items-center gap-2">
          <FolderPlus className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
            Nova categoria · {currentUser.name}
          </h2>
        </div>

        <form
          onSubmit={handleCreate}
          noValidate
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end"
        >
          <div className="sm:col-span-6">
            <label
              htmlFor="new-category-name"
              className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Nome *
            </label>
            <input
              id="new-category-name"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Educação, Lazer, Pets..."
              key={`cat-err-${error ? shakeTrigger : 'ok'}`}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-zinc-900 outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                error
                  ? 'animate-shake border-red-500 bg-red-50/40 ring-2 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50'
                  : 'border-zinc-200 bg-white focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:focus:border-white/40'
              }`}
            />
          </div>

          <div className="sm:col-span-4">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Cor
            </span>
            <div className="flex h-[42px] flex-wrap items-center gap-1.5">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  aria-label={`Selecionar cor ${color}`}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    newColor === color
                      ? 'scale-110 border-zinc-900 dark:border-white'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 whitespace-nowrap"
            >
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              <span>Criar</span>
            </button>
          </div>
        </form>
        {error && (
          <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      <div
        ref={listRef}
        className="rounded-2xl border border-zinc-200/80 bg-white dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-white/10">
          <h3 className="inline-flex items-center gap-2 font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
            <FolderKanban className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
            <span>Categorias</span>
          </h3>
          <span className="font-mono text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
            {userCategories.length}
          </span>
        </div>

        {userCategories.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Nenhuma categoria cadastrada.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 px-5 dark:divide-white/[0.06]">
            {userCategories.map((cat) => {
              const usageCount = expenses.filter(
                (e) => e.categoryId === cat.id
              ).length;
              const isEditing = editingId === cat.id;
              const menuOpen = openMenuId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-3 py-3.5"
                >
                  {isEditing ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <input
                        type="text"
                        aria-label={`Novo nome para ${cat.name}`}
                        value={editName}
                        onChange={(e) => {
                          setEditName(e.target.value);
                          if (editError) setEditError('');
                        }}
                        key={`edit-cat-${editError ? shakeTrigger : 'ok'}`}
                        className={`rounded-xl border px-3 py-1.5 text-sm text-zinc-900 outline-none dark:text-zinc-100 ${
                          editError
                            ? 'animate-shake border-red-500 bg-red-50/40 dark:bg-red-950/30'
                            : 'border-zinc-300 bg-white focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:focus:border-white/40'
                        }`}
                      />
                      <div className="flex items-center gap-1">
                        {CATEGORY_COLORS.slice(0, 6).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            aria-label={`Cor ${c}`}
                            className={`h-5 w-5 rounded-full border-2 transition-transform ${
                              editColor === c
                                ? 'scale-110 border-zinc-900 dark:border-white'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      {editError && (
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          {editError}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {cat.name}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-zinc-400 dark:text-zinc-500"
                        title={`${usageCount} ${
                          usageCount === 1 ? 'gasto vinculado' : 'gastos vinculados'
                        }`}
                      >
                        <Receipt className="h-3 w-3" aria-hidden="true" />
                        {usageCount}
                      </span>
                    </div>
                  )}

                  <div className="relative flex shrink-0 items-center gap-1.5">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          aria-label={`Salvar categoria ${cat.name}`}
                          className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Salvar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancelar edição de categoria"
                          className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-white/12 dark:text-zinc-300 dark:hover:bg-white/10"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId((cur) => (cur === cat.id ? null : cat.id))
                          }
                          aria-label={`Ações da categoria ${cat.name}`}
                          aria-haspopup="menu"
                          aria-expanded={menuOpen}
                          className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {menuOpen && (
                          <div
                            role="menu"
                            aria-label={`Menu da categoria ${cat.name}`}
                            className="animate-menu absolute right-0 top-full z-30 mt-1 w-40 origin-top-right rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/12 dark:bg-[#171A21]/95"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null);
                                startEdit(cat);
                              }}
                              className="flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
                            >
                              <Pencil className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null);
                                onDeleteCategory(cat.id);
                              }}
                              className="flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
