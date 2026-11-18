import { useEffect, useMemo, useRef, useState } from "react";
import { HiViewBoards, HiX, HiCheck, HiChevronRight, HiPencil, HiTrash } from "react-icons/hi";
import { LoadingLine } from "../components/CustomTable";
import { CustomButton } from "../components/FormFields";
import Portal from "./Portal";
import { tableSettings } from "./tableConfig";

/* One list component for the whole app. What it does is switched in ui/tableConfig.js.
 *
 * columns: [{
 *   key, label,
 *   render(row)        what the cell shows (default: row[key])
 *   align: "right"     amounts and counts
 *   always: true       can't be hidden (the identity column)
 *   detail: false      leave out of the side panel
 *   card: "title" | "subtitle" | "badge" | true     how it appears on a phone card
 * }]
 * actions(row)  the Edit / Delete buttons of a row
 * detail: { title(row), subtitle(row), extra: [{ label, render(row) }] }   the side panel
 */

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* private mode */ } },
};
const DENSITY_KEY = "ais.table.density";

const cellText = (col, row) => (col.render ? col.render(row) : (row[col.key] ?? "—"));

export default function DataTable({
  id, columns, rows, rowKey = (r) => r.id, loading = false, empty = "Nothing to show.",
  actions, detail, toolbar, footer, onRowClick,
}) {
  const cfg = tableSettings(id);
  const colsKey = `ais.table.${id}.cols`;

  const defaultVisible = useMemo(
    () => (cfg.visible ? columns.filter((c) => c.always || cfg.visible.includes(c.key)) : columns).map((c) => c.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id]
  );
  const [visible, setVisible] = useState(() => {
    const saved = cfg.columnPicker ? store.get(colsKey) : null;
    return Array.isArray(saved) ? saved : defaultVisible;
  });
  const [density, setDensity] = useState(() => store.get(DENSITY_KEY) || cfg.density);
  const [open, setOpen] = useState(null);         // the row in the side panel

  const shown = columns.filter((c) => c.always || visible.includes(c.key));
  const compact = density === "compact";
  const pad = compact ? "px-3 py-2" : "px-4 py-3";
  const canOpen = cfg.rowDetails && (detail || onRowClick);

  const openRow = (row) => (onRowClick ? onRowClick(row) : setOpen(row));

  const toggleCol = (key) => {
    const next = visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key];
    setVisible(next); store.set(colsKey, next);
  };
  const resetCols = () => { setVisible(defaultVisible); store.del(colsKey); };
  const changeDensity = (d) => { setDensity(d); store.set(DENSITY_KEY, d); };

  // the open record follows a refreshed list (an edit saved from the panel shows at once)
  useEffect(() => {
    if (!open) return;
    const fresh = rows.find((r) => rowKey(r) === rowKey(open));
    if (!fresh) setOpen(null); else if (fresh !== open) setOpen(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const pinFirst = cfg.pinFirst;
  const pinActions = cfg.pinActions && actions;
  const stickyBg = "bg-white group-hover:bg-purple-50 dark:bg-gray-800 dark:group-hover:bg-gray-700";
  const headBg = "bg-gray-50 dark:bg-gray-700";

  const message = (text) => (
    <tr><td colSpan={shown.length + (actions ? 1 : 0)} className="px-4 py-10 text-sm text-gray-400">
      <div className="table-message">{text}</div>
    </td></tr>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {(toolbar || cfg.columnPicker) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{toolbar}</div>
          {cfg.columnPicker && (
            // phones show cards, where columns don't apply
            <div className={cfg.mobileCards ? "hidden md:block" : ""}>
              <ColumnMenu columns={columns} visible={visible} onToggle={toggleCol} onReset={resetCols}
                density={density} onDensity={changeDensity} />
            </div>
          )}
        </div>
      )}

      {/* phone: cards */}
      {cfg.mobileCards && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700 md:hidden">
          {loading ? <li className="px-4 py-10 text-center text-sm text-gray-400"><LoadingLine /></li>
            : rows.length === 0 ? <li className="px-4 py-10 text-center text-sm text-gray-400">{empty}</li>
            : rows.map((r) => <Card key={rowKey(r)} row={r} columns={columns} shown={shown}
                onOpen={canOpen ? () => openRow(r) : null} />)}
        </ul>
      )}

      {/* tablet and desktop: the table */}
      <div className={`table-viewport ${cfg.mobileCards ? "hidden md:block" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className={`sticky top-0 z-20 ${headBg} shadow-[inset_0_-1px_0_rgb(229,231,235)] dark:shadow-[inset_0_-1px_0_rgb(75,85,99)]`}>
            <tr>
              {shown.map((c, i) => (
                <th key={c.key} scope="col"
                  className={`whitespace-nowrap ${compact ? "px-3 py-2.5" : "px-4 py-3"} text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${
                    c.align === "right" ? "text-right" : ""} ${i === 0 && pinFirst ? `sticky left-0 z-10 ${headBg} pin-edge-r` : ""}`}>
                  {c.label}
                </th>
              ))}
              {actions && (
                <th scope="col" className={`whitespace-nowrap ${compact ? "px-3 py-2.5" : "px-4 py-3"} text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${
                  pinActions ? `sticky right-0 z-10 ${headBg} pin-edge-l` : ""}`}>
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? message(<LoadingLine />)
              : rows.length === 0 ? message(empty)
              : rows.map((r) => (
                <tr key={rowKey(r)}
                  className={`group bg-white transition-colors hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-gray-700 ${canOpen ? "cursor-pointer" : ""}`}
                  onClick={canOpen ? () => openRow(r) : undefined}
                  onKeyDown={canOpen ? (e) => { if (e.key === "Enter") openRow(r); } : undefined}
                  tabIndex={canOpen ? 0 : undefined}>
                  {shown.map((c, i) => (
                    <td key={c.key}
                      className={`whitespace-nowrap ${pad} text-sm text-gray-700 dark:text-gray-300 ${
                        c.align === "right" ? "text-right tabular-nums" : ""} ${i === 0 && pinFirst ? `sticky left-0 z-10 ${stickyBg} pin-edge-r` : ""} ${c.className || ""}`}>
                      {cellText(c, r)}
                    </td>
                  ))}
                  {actions && (
                    <td className={`whitespace-nowrap ${pad} ${pinActions ? `sticky right-0 z-10 ${stickyBg} pin-edge-l` : ""}`}
                      onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">{actions(r)}</div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {footer}
        </div>
      )}

      {open && !onRowClick && (
        <DetailPanel row={open} columns={columns} detail={detail} actions={actions} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

/* The usual Edit / Delete pair: round icons in the table, labelled buttons in the side panel.
 * Leave out onEdit or onDelete to show only the other one. */
export function RowActions({ inPanel, onEdit, onDelete, editPerm, deletePerm, extra }) {
  return (
    <>
      {extra}
      {onEdit && (
        <CustomButton perm={editPerm} size="xs" color="blue" outline pill={!inPanel} onClick={onEdit} title="Edit">
          <HiPencil className="h-3.5 w-3.5" />{inPanel && <span className="ml-1.5">Edit</span>}
        </CustomButton>
      )}
      {onDelete && (
        <CustomButton perm={deletePerm} size="xs" color="failure" outline pill={!inPanel} onClick={onDelete} title="Delete">
          <HiTrash className="h-3.5 w-3.5" />{inPanel && <span className="ml-1.5">Delete</span>}
        </CustomButton>
      )}
    </>
  );
}

/* ---------- a record as a card (phones) ---------- */
function Card({ row, columns, shown, onOpen }) {
  const title = columns.find((c) => c.card === "title") || columns[0];
  const subtitle = columns.find((c) => c.card === "subtitle");
  const badge = columns.find((c) => c.card === "badge");
  const facts = shown.filter((c) => c.card === true);
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{cellText(title, row)}</div>
          {subtitle && <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{cellText(subtitle, row)}</div>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {badge && cellText(badge, row)}
          {onOpen && <HiChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </div>
      {facts.length > 0 && (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          {facts.map((c) => (
            <div key={c.key} className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">{c.label}</dt>
              <dd className="truncate text-sm text-gray-700 dark:text-gray-200">{cellText(c, row)}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
  return (
    <li>
      {onOpen ? (
        <button type="button" onClick={onOpen} className="block w-full px-4 py-3 text-left active:bg-purple-50 dark:active:bg-gray-700">{body}</button>
      ) : <div className="px-4 py-3">{body}</div>}
    </li>
  );
}

/* ---------- every field of one record, in a panel on the right ---------- */
function DetailPanel({ row, columns, detail = {}, actions, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  const fields = [
    ...columns.filter((c) => c.detail !== false && c.card !== "title"),
    ...(detail.extra || []).map((x, i) => ({ key: `x${i}`, ...x })),
  ];
  return (
    <Portal>
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Record details">
      <div className="fb-fade absolute inset-0 bg-gray-900/40" onClick={onClose} />
      <aside className="panel-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">
              {detail.title ? detail.title(row) : cellText(columns[0], row)}
            </h2>
            {detail.subtitle && <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{detail.subtitle(row)}</p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} data-modal-close aria-label="Close"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 dark:text-gray-400 dark:hover:bg-gray-700">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <dl className="flex-1 divide-y divide-gray-100 overflow-y-auto px-5 dark:divide-gray-700">
          {fields.map((f) => (
            <div key={f.key} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">{f.label}</dt>
              <dd className="min-w-0 text-right text-sm font-medium text-gray-800 dark:text-gray-100">{cellText(f, row)}</dd>
            </div>
          ))}
        </dl>
        {actions && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-700" onClick={onClose}>
            {actions(row, { inPanel: true })}
          </div>
        )}
      </aside>
    </div>
    </Portal>
  );
}

/* ---------- the Columns menu ---------- */
function ColumnMenu({ columns, visible, onToggle, onReset, density, onDensity }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc, true); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
        <HiViewBoards className="h-4 w-4" /> Columns
      </button>
      {open && (
        <div className="fb-pop absolute right-0 z-30 mt-2 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Show columns</p>
          <div className="max-h-72 overflow-y-auto">
            {columns.map((c) => {
              const on = c.always || visible.includes(c.key);
              return (
                <button key={c.key} type="button" disabled={c.always} onClick={() => onToggle(c.key)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:opacity-60 dark:text-gray-200 dark:hover:bg-gray-700">
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? "border-purple-600 bg-purple-600 text-white" : "border-gray-300 dark:border-gray-500"}`}>
                    {on && <HiCheck className="h-3 w-3" />}
                  </span>
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 border-t border-gray-100 px-3 pt-2 dark:border-gray-700">
            <p className="pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Rows</p>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
              {[["compact", "Compact"], ["comfortable", "Comfortable"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => onDensity(v)} aria-pressed={density === v}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${density === v ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-300"}`}>
                  {l}
                </button>
              ))}
            </div>
            <button type="button" onClick={onReset} className="mt-2 text-xs font-medium text-purple-600 hover:underline dark:text-purple-400">
              Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
