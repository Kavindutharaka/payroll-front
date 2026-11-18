import { useState, useEffect, useCallback } from "react";
import Layout from "../../../components/Layout";
import { StatusBadge } from "../../../components/StatusBadge";
import { HiTrendingUp, HiSearch, HiCheck, HiRefresh, HiDownload, HiExclamation, HiReply, HiPrinter } from "react-icons/hi";
import { CustomButton, CustomInput, CustomSelect } from "../../../components/FormFields";
import { sheetClasses as sheet } from "../../../ui/tableConfig";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { fetchActiveEmployees } from "../../../services/employeeService";
import {
  fetchIncrements, regenerateIncrementSheet,
  updateIncrement, applyIncrements, mergeIncrementsIntoBasic,
  revokeIncrements, undoIncrementMerge,
} from "../../../services/incrementBonusService";
import { downloadCSV } from "../../../services/reportService";
import { confirmDialog } from "../../../ui/feedback";
import { useCan } from "../../../auth/AuthContext";
import { freshReads } from "../../../services/api";

const money = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
// what the person will earn in basic + budgetary once the increment is in
const newTotal = (r) => Number(r.newBasic || 0) + Number(r.budgetaryAllowance || 0);
const monthLabel = (m) => {
  if (!m) return "";
  const [y, mm] = String(m).split("-");
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};
// Increments normally take effect in September.
const defaultMonth = () => `${new Date().getFullYear()}-09`;

export default function IncrementSheet() {
  const [month, setMonth]     = useState(defaultMonth);
  const [rows, setRows]       = useState([]);
  const [search, setSearch]   = useState("");
  const [cat, setCat]         = useState("all");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy]       = useState("");
  const [error, setError]     = useState("");
  const [savingId, setSaving] = useState(null);
  const [notice, setNotice]   = useState("");

  const canEdit = useCan()("increment.edit");
  const applied = rows.length > 0 && rows.some((r) => r.status === "Applied");
  const merged  = rows.length > 0 && rows.every((r) => r.status === "Merged");
  const stage   = merged ? "Merged" : applied ? "Applied" : "Draft";

  const load = useCallback(async (m) => {
    setLoading(true); setError("");
    try {
      const d = await fetchIncrements(m);
      // i.* already carries the name stored at generation, so the payslip-style
      // name comes back under its own column and replaces it here
      setRows((Array.isArray(d) ? d : []).map((r) => ({ ...r, empName: r.displayName || r.empName })));
    } catch (e) {
      console.error(e); setError("Could not load the increment sheet.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { setNotice(""); load(month); }, [month, load]);

  const handleGenerate = async () => {
    const typed = rows.filter((r) => r.status === "Draft" && Number(r.incrementAmount) > 0).length;
    if (typed && !(await confirmDialog({
      title: `Regenerate the ${monthLabel(month)} sheet?`,
      message: `${typed} increment amount${typed === 1 ? " is" : "s are"} already typed in and will be cleared.`,
      confirmLabel: "Regenerate", tone: "danger",
    }))) return;
    setBusy("Generating…"); setError(""); setNotice("");
    try {
      const emps = await freshReads(() => fetchActiveEmployees());
      const list = (Array.isArray(emps) ? emps : []).map((e) => ({
        emp_id: e.emp_id,
        empName: `${e.initial ?? ""} ${e.firstName ?? ""} ${e.surName ?? ""}`.replace(/\s+/g, " ").trim(),
        category: e.category ?? "",
        basicSalary: e.basicSalary,
      }));
      await regenerateIncrementSheet(month, list);
      await load(month);
    } catch (e) {
      console.error(e); setError("Could not generate the sheet.");
    } finally { setBusy(""); }
  };

  const editAmount = (id, value) =>
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const amt = Number(value) || 0;
      return { ...r, incrementAmount: value, newBasic: Number(r.currentBasic || 0) + amt };
    }));

  const commitAmount = async (row) => {
    if (row.status !== "Draft") return;
    setSaving(row.id);
    try { await updateIncrement(row.id, Number(row.incrementAmount) || 0); }
    catch (e) { console.error(e); setError("Could not save that amount."); }
    finally { setSaving(null); }
  };

  const handleApply = async () => {
    const changed = rows.filter((r) => Number(r.incrementAmount) > 0).length;
    if (changed === 0) { setError("Enter at least one increment amount first."); return; }
    if (!(await confirmDialog({
      title: `Apply ${changed} increment${changed === 1 ? "" : "s"} for ${monthLabel(month)}?`,
      message: "They will show as a separate Increment line on that month's payroll. Basic salary is not changed yet — that happens when you merge them.",
      confirmLabel: "Apply increments",
    }))) return;
    setBusy("Applying…"); setError("");
    try { await applyIncrements(month); await load(month); }
    catch (e) { console.error(e); setError("Could not apply the increments."); }
    finally { setBusy(""); }
  };

  const handleMerge = async () => {
    if (!(await confirmDialog({
      title: "Merge these increments into basic salary?",
      message: `Do this once ${monthLabel(month)} has been paid. From the next month the rise becomes part of basic and the separate Increment line disappears. Undo Merge puts it back if needed.`,
      confirmLabel: "Merge into basic",
    }))) return;
    setBusy("Merging…"); setError("");
    try { await mergeIncrementsIntoBasic(month); await load(month); }
    catch (e) { console.error(e); setError("Could not merge the increments."); }
    finally { setBusy(""); }
  };

  // the SP reports what it did: rows moved, rows left alone, or refused outright
  const outcome = (res) => (Array.isArray(res) ? res[0] : res) || {};
  const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? "" : "s"}`;

  const handleRevoke = async () => {
    const n = rows.filter((r) => r.status === "Applied").length;
    if (!(await confirmDialog({
      title: `Revoke ${plural(n, "applied increment")} for ${monthLabel(month)}?`,
      message: `They go back to Draft with the amounts kept, so you can change them and apply again. Recalculate ${monthLabel(month)} payroll afterwards so the Increment line comes off.`,
      confirmLabel: "Revoke", tone: "danger",
    }))) return;
    setBusy("Revoking…"); setError(""); setNotice("");
    try {
      const o = outcome(await revokeIncrements(month));
      if (Number(o.blocked)) {
        setError(`${monthLabel(month)} payroll is already marked Paid, so its increments can't be revoked.`);
      } else {
        setNotice(`Revoked ${plural(o.affected, "increment")} — back to Draft. ` +
          `Recalculate ${monthLabel(month)} payroll to take ${Number(o.affected) === 1 ? "it" : "them"} off.`);
      }
      await load(month);
    } catch (e) { console.error(e); setError("Could not revoke the increments."); }
    finally { setBusy(""); }
  };

  const handleUndoMerge = async () => {
    const n = rows.filter((r) => r.status === "Merged").length;
    if (!(await confirmDialog({
      title: `Undo the merge for ${monthLabel(month)}?`,
      message: `Basic salary goes back to the figure before the increment for ${plural(n, "employee")}, and the increments return to Applied. Anyone whose basic salary was changed after the merge is left as they are.`,
      confirmLabel: "Undo merge", tone: "danger",
    }))) return;
    setBusy("Undoing merge…"); setError(""); setNotice("");
    try {
      const o = outcome(await undoIncrementMerge(month));
      if (Number(o.blocked)) {
        setError(`A payroll after ${monthLabel(month)} is already marked Paid on the new basic salary, so the merge can't be undone.`);
      } else {
        setNotice(`Basic salary put back for ${plural(o.affected, "employee")}.` +
          (Number(o.skipped) ? ` ${plural(o.skipped, "employee")} left unchanged — their basic salary was edited after the merge.` : "") +
          ` Recalculate any payroll already run after ${monthLabel(month)}.`);
      }
      await load(month);
    } catch (e) { console.error(e); setError("Could not undo the merge."); }
    finally { setBusy(""); }
  };

  // 224 people on a sheet is too many to scroll: search by name or ID, or take
  // one category at a time. The totals below follow whatever is on screen.
  const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))].sort();
  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const hit = !q || (/^\d+$/.test(q)
      ? String(r.emp_id) === q
      : (r.empName || "").toLowerCase().includes(q));
    return hit && (cat === "all" || r.category === cat);
  });
  const withAmount = filtered.filter((r) => Number(r.incrementAmount) > 0);
  const totalIncrement = filtered.reduce((a, r) => a + (Number(r.incrementAmount) || 0), 0);

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Increment Sheet</h1>
            <p className="mt-1 text-sm text-gray-500">Shown as a separate line that month, then merged into basic salary</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
            <StatusBadge color={merged ? "success" : applied ? "indigo" : "warning"}
              className="px-3 py-1.5 text-sm font-semibold">{stage}</StatusBadge>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <HiExclamation className="h-5 w-5 flex-shrink-0" /> {error}
          </div>
        )}
        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
            <HiCheck className="h-5 w-5 flex-shrink-0" /> {notice}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <CustomButton perm="increment.edit" color="purple" disabled={!!busy || applied || merged} onClick={handleGenerate}>
            <HiRefresh className="mr-2 h-4 w-4" /> {rows.length ? "Regenerate Sheet" : "Generate Sheet"}
          </CustomButton>
          {!applied && !merged && rows.length > 0 && (
            <CustomButton perm="increment.apply" color="indigo" disabled={!!busy} onClick={handleApply}>
              <HiCheck className="mr-2 h-4 w-4" /> Apply to {monthLabel(month)} Payroll
            </CustomButton>
          )}
          {applied && !merged && (
            <CustomButton perm="increment.apply" color="success" disabled={!!busy} onClick={handleMerge}>
              <HiTrendingUp className="mr-2 h-4 w-4" /> Merge into Basic Salary
            </CustomButton>
          )}
          {applied && !merged && (
            <CustomButton perm="increment.apply" color="failure" outline disabled={!!busy} onClick={handleRevoke}>
              <HiReply className="mr-2 h-4 w-4" /> Revoke
            </CustomButton>
          )}
          {merged && (
            <CustomButton perm="increment.apply" color="failure" outline disabled={!!busy} onClick={handleUndoMerge}>
              <HiReply className="mr-2 h-4 w-4" /> Undo Merge
            </CustomButton>
          )}
          {/* export and print take what is on screen, so a category picked in the
              dropdown gives that category's sheet on its own */}
          <CustomButton color="gray" outline disabled={filtered.length === 0} onClick={() => window.print()}>
            <HiPrinter className="mr-2 h-4 w-4" /> Print
          </CustomButton>
          <CustomButton color="gray" outline disabled={filtered.length === 0}
            onClick={() => downloadCSV(
              `increments-${month}${cat === "all" ? "" : "-" + cat.replace(/[^A-Za-z0-9]+/g, "-")}.csv`,
              filtered.map((r) => ({ ...r, newTotal: newTotal(r) })), [
              { key: "emp_id", label: "Emp ID" }, { key: "empName", label: "Employee" },
              { key: "category", label: "Category" }, { key: "currentBasic", label: "Current Basic" },
              { key: "budgetaryAllowance", label: "Bud. Allow" },
              { key: "incrementAmount", label: "Increment" }, { key: "newBasic", label: "New Basic" },
              { key: "newTotal", label: "New Basic + Bud." },
            ])}>
            <HiDownload className="mr-2 h-4 w-4" /> Export CSV
          </CustomButton>
          <CustomInput icon={HiSearch} placeholder="Search name or ID..." sizing="sm" className="w-56"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <CustomSelect sizing="sm" className="w-56" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </CustomSelect>
          {busy && <span className="text-sm text-gray-500">{busy}</span>}
        </div>

        {applied && !merged && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
            Applied. {monthLabel(month)} payroll will show these as a separate <span className="font-semibold">Increment</span> line
            and basic salary is unchanged. Once that month is paid, use <span className="font-semibold">Merge into Basic Salary</span>.
          </div>
        )}
        {merged && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
            Merged — these amounts are now part of basic salary, so future payroll, EPF and ETF all use the higher figure.
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className={`table-viewport ${sheet.wrap}`}>
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell className={sheet.pinHead}>Employee</CustomTableHeadCell>
                  <CustomTableHeadCell>Category</CustomTableHeadCell>
                  <CustomTableHeadCell>Current Basic</CustomTableHeadCell>
                  <CustomTableHeadCell>Bud. Allow</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Increment ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-green-600">New Basic</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-green-600">New Basic + Bud.</CustomTableHeadCell>
                  <CustomTableHeadCell>Status</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={8} className="py-10 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : filtered.length === 0 ? (
                  <CustomTableRow><CustomTableCell colSpan={8} className="py-10 text-center text-sm text-gray-400">
                    No sheet for {monthLabel(month)} yet — click <span className="font-semibold">Generate Sheet</span>.
                  </CustomTableCell></CustomTableRow>
                ) : filtered.map((r) => (
                  <CustomTableRow key={r.id} className={`${sheet.row} hover:bg-purple-50 dark:hover:bg-gray-700`}>
                    <CustomTableCell className={sheet.pinCell}>
                      <p className="whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">{r.empName}</p>
                      <p className="font-mono text-xs text-purple-500">{r.emp_id}</p>
                    </CustomTableCell>
                    <CustomTableCell className="whitespace-nowrap text-xs text-gray-500">{r.category || "—"}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-700 dark:text-gray-300">{money(r.currentBasic)}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-700 dark:text-gray-300">{money(r.budgetaryAllowance)}</CustomTableCell>
                    <CustomTableCell>
                      {r.status === "Draft" && canEdit ? (
                        <input type="number" step="0.01" min="0" disabled={savingId === r.id}
                          value={r.incrementAmount ?? 0}
                          onChange={(e) => editAmount(r.id, e.target.value)}
                          onBlur={() => commitAmount(r)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                          className="w-28 rounded border border-gray-300 bg-amber-50 px-2 py-1 text-sm text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
                      ) : (
                        <span className="text-sm text-gray-600">{money(r.incrementAmount)}</span>
                      )}
                    </CustomTableCell>
                    <CustomTableCell className="whitespace-nowrap text-sm font-bold text-green-600">{money(r.newBasic)}</CustomTableCell>
                    <CustomTableCell className="whitespace-nowrap text-sm font-bold text-green-700">{money(newTotal(r))}</CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color={r.status === "Merged" ? "success" : r.status === "Applied" ? "indigo" : "warning"}
                        className="w-fit text-xs">{r.status}</StatusBadge>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </div>

          {filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-4 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-900/50 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Employees on sheet</p>
                <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{filtered.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Receiving an increment</p>
                <p className="text-lg font-bold text-purple-600">{withAmount.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total monthly increase</p>
                <p className="text-lg font-bold text-green-600">Rs. {money(totalIncrement)}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <HiTrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Leave an employee at 0 to skip them — only non-zero rows are applied.
            Apply first so the increment shows as its own line on that month's payslip, then merge it into
            basic salary once the month has been paid.
          </span>
        </div>
      </div>
      {filtered.length > 0 && (
        <div className="inc-print-only">
          <h2>Increment Sheet — {monthLabel(month)}</h2>
          <p className="meta">{cat === "all" ? "All categories" : cat} · {filtered.length} employees · printed {new Date().toLocaleDateString("en-GB")}</p>
          <table>
            <thead>
              <tr><th>EPF No</th><th>Employee</th><th>Category</th><th className="num">Current Basic</th>
                  <th className="num">Bud. Allow</th><th className="num">Increment</th><th className="num">New Basic</th>
                  <th className="num">New Basic + Bud.</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.emp_id}</td><td>{r.empName}</td><td>{r.category}</td>
                  <td className="num">{money(r.currentBasic)}</td><td className="num">{money(r.budgetaryAllowance)}</td>
                  <td className="num">{money(r.incrementAmount)}</td><td className="num">{money(r.newBasic)}</td>
                  <td className="num">{money(newTotal(r))}</td>
                </tr>
              ))}
              <tr className="grand">
                <td colSpan={5}>TOTAL</td>
                <td className="num">{money(totalIncrement)}</td><td></td><td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        .inc-print-only { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body * { visibility: hidden; }
          .inc-print-only, .inc-print-only * { visibility: visible; }
          .inc-print-only { display: block; position: absolute; left: 0; top: 0; width: 100%; color: #000; font-size: 9px; }
          .inc-print-only h2 { font-size: 13px; font-weight: 700; margin: 0 0 2px; }
          .inc-print-only .meta { font-size: 8px; color: #444; margin: 0 0 6px; }
          .inc-print-only table { width: 100%; border-collapse: collapse; }
          .inc-print-only th, .inc-print-only td { border: 1px solid #999; padding: 2px 4px; text-align: left; }
          .inc-print-only th { background: #eee; }
          .inc-print-only .num { text-align: right; white-space: nowrap; }
          .inc-print-only thead { display: table-header-group; }
          .inc-print-only tr { page-break-inside: avoid; }
          .inc-print-only tr.grand td { font-weight: 700; background: #e8e8e8; border-top: 2px solid #333; }
        }
      `}</style>
    </Layout>
  );
}
