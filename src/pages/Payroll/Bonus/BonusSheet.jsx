import { useState, useEffect, useCallback } from "react";
import Layout from "../../../components/Layout";
import { StatusBadge } from "../../../components/StatusBadge";
import { HiGift, HiSearch, HiCheck, HiRefresh, HiDownload, HiExclamation } from "react-icons/hi";
import { CustomButton, CustomInput } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { fetchActiveEmployees } from "../../../services/employeeService";
import { fetchAllStructures } from "../../../services/salaryStructureService";
import {
  fetchBonuses, regenerateBonusSheet, updateBonus, finaliseBonuses,
  fetchBonusTaxInputs, saveBonusPaye, saveBonusPayeManual, fetchBonusLeave, saveBonusLeave, fetchBonusLate, saveBonusLate,
  fetchCurrentBasics,
} from "../../../services/incrementBonusService";
import {
  bonusPaye, assessmentYear, leaveDeduction, bonusLeaveCycle, lateDeduction, bonusLateCycle, LATE_RULE_FROM,
} from "../../../services/bonusTax";
import { fetchTaxSlabs } from "../../../services/taxService";
import { calcPAYE } from "../../../services/payrollRunService";
import { downloadCSV } from "../../../services/reportService";
import { confirmDialog } from "../../../ui/feedback";
import { useCan } from "../../../auth/AuthContext";
import { freshReads } from "../../../services/api";

const DEFAULT_MODE = "Tax Table 1";   // the monthly table, used when someone has no payroll month yet

const money = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const monthLabel = (m) => {
  if (!m) return "";
  const [y, mm] = String(m).split("-");
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};
// Bonus is normally paid in December.
const defaultMonth = () => `${new Date().getFullYear()}-12`;

export default function BonusSheet() {
  const [month, setMonth]     = useState(defaultMonth);
  const [rows, setRows]       = useState([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy]       = useState("");
  const [error, setError]     = useState("");
  const [savingId, setSaving] = useState(null);
  const [taxIn, setTaxIn]     = useState({});   // per row id: what Tax Table 02 needs
  const [slabs, setSlabs]     = useState([]);
  const [basics, setBasics]   = useState({});   // emp_id -> basic salary now

  const canEdit = useCan()("bonus.edit");
  const finalised = rows.length > 0 && rows.every((r) => r.status === "Finalised");

  const load = useCallback(async (m) => {
    setLoading(true); setError("");
    try {
      const [d, inputs, s, b] = await Promise.all([
        fetchBonuses(m), fetchBonusTaxInputs(m).catch(() => []), fetchTaxSlabs(DEFAULT_MODE).catch(() => []),
        fetchCurrentBasics().catch(() => []),
      ]);
      setBasics(Object.fromEntries((Array.isArray(b) ? b : []).map((x) => [String(x.emp_id), Number(x.basicSalary) || 0])));
      setRows((Array.isArray(d) ? d : []).map((r) => ({ ...r, empName: r.displayName || r.empName })));
      setTaxIn(Object.fromEntries((Array.isArray(inputs) ? inputs : []).map((x) => [x.id, x])));
      setSlabs(Array.isArray(s) ? s : []);
    } catch (e) {
      console.error(e); setError("Could not load the bonus sheet.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  /* The leave and late-attendance deductions are each a share of the annual
   * bonus, so they are added: 10% for leave and 20% for lateness is 30% off.
   * null where the leave rule does not cover the case - the amount is then left
   * as it is for Nadee to decide. */
  const deductionPct = (r, leave, late) => {
    const lv = leaveDeduction(leave, r.category);
    return lv.pct === null ? null : lv.pct + lateDeduction(late, month).pct;
  };
  const amountAfter = (r, pct) =>
    Math.round((Number(r.basicSalary || 0) + Number(r.budgetaryAllowance || 0)) * (1 - pct / 100));

  const handleGenerate = async () => {
    setBusy("Generating…"); setError("");
    try {
      const [emps, structures, leave, late] = await freshReads(() => Promise.all([
        fetchActiveEmployees(), fetchAllStructures(), fetchBonusLeave(month).catch(() => []),
        fetchBonusLate(month).catch(() => []),
      ]));
      const leaveBy = Object.fromEntries((Array.isArray(leave) ? leave : []).map((x) => [String(x.emp_id), Number(x.days) || 0]));
      const lateBy  = Object.fromEntries((Array.isArray(late) ? late : []).map((x) => [String(x.emp_id), x]));
      // budgetary allowance per employee — it forms part of the bonus
      const budgetary = {};
      (Array.isArray(structures) ? structures : []).forEach((s) => {
        if (s.type === "Allowance" && (s.componentName || "").toLowerCase().includes("budgetary")) {
          const k = String(s.emp_id);
          budgetary[k] = (budgetary[k] || 0) + Number(s.value || 0);
        }
      });

      const list = (Array.isArray(emps) ? emps : []).map((e) => {
        const basic = Number(e.basicSalary) || 0;
        const bud   = budgetary[String(e.emp_id)] || 0;
        const days  = leaveBy[String(e.emp_id)] || 0;
        // administrative staff count late days to August, everyone else to June
        const lt    = lateBy[String(e.emp_id)];
        const late  = Number(/administrative/i.test(e.category || "") ? lt?.toAugust : lt?.toJune) || 0;
        const row   = { basicSalary: basic, budgetaryAllowance: bud, category: e.category ?? "" };
        const pct   = deductionPct(row, days, late);
        return {
          ...row,
          emp_id: e.emp_id,
          empName: `${e.initial ?? ""} ${e.firstName ?? ""} ${e.surName ?? ""}`.replace(/\s+/g, " ").trim(),
          leaveDays: days,
          lateDays: late,
          // one month's salary, less the deductions where the rules are clear
          bonusAmount: amountAfter(row, pct ?? 0),
        };
      });

      await regenerateBonusSheet(month, list);
      await load(month);
    } catch (e) {
      console.error(e); setError("Could not generate the sheet.");
    } finally { setBusy(""); }
  };

  const editLeave = (id, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, leaveDays: value } : r)));

  const commitLeave = async (row) => {
    if (row.status !== "Draft") return;
    const days = Number(row.leaveDays) || 0;
    const pct  = deductionPct(row, days, row.lateDays);
    // where the rule does not cover the case the amount is left as it is
    const amount = pct === null ? Number(row.bonusAmount) || 0 : amountAfter(row, pct);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, leaveDays: days, bonusAmount: amount } : r)));
    setSaving(row.id);
    try { await saveBonusLeave(row.id, days, amount); }
    catch (e) { console.error(e); setError("Could not save the leave days."); }
    finally { setSaving(null); }
  };

  const editLate = (id, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, lateDays: value } : r)));

  const commitLate = async (row) => {
    if (row.status !== "Draft") return;
    const days = Number(row.lateDays) || 0;
    const pct  = deductionPct(row, row.leaveDays, days);
    const amount = pct === null ? Number(row.bonusAmount) || 0 : amountAfter(row, pct);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, lateDays: days, bonusAmount: amount } : r)));
    setSaving(row.id);
    try { await saveBonusLate(row.id, days, amount); }
    catch (e) { console.error(e); setError("Could not save the late days."); }
    finally { setSaving(null); }
  };

  const editAmount = (id, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, bonusAmount: value } : r)));

  const commitAmount = async (row) => {
    if (row.status !== "Draft") return;
    setSaving(row.id);
    try { await updateBonus(row.id, Number(row.bonusAmount) || 0); }
    catch (e) { console.error(e); setError("Could not save that amount."); }
    finally { setSaving(null); }
  };

  /* PAYE on each bonus - Tax Table 02. Someone with no payroll month in the
   * system yet is estimated from their basic + budgetary and the monthly table. */
  const taxFor = (r) => {
    const x = taxIn[r.id] || {};
    const hasLatest = x.latestGross !== null && x.latestGross !== undefined;
    const monthly = Number(r.basicSalary || 0) + Number(r.budgetaryAllowance || 0);
    return bonusPaye({
      month, bonus: Number(r.bonusAmount) || 0,
      paid:    { months: x.paidMonths, gross: x.paidGross, paye: x.paidPaye },
      latest:  hasLatest ? { gross: x.latestGross, paye: x.latestPaye }
                         : { gross: monthly, paye: Math.round(calcPAYE(monthly, slabs)) },
      earlier: { amount: x.earlierAmount, paye: x.earlierPaye },
      joined:  x.joinedMonth || null,
    });
  };
  // once finalised the stored figure is the record; before that it follows the
  // amount - unless a figure was typed in by hand, which then stands
  const isManual = (r) => r.payeManual === true || r.payeManual === 1;
  const payeOf = (r) => ((r.status === "Finalised" || isManual(r)) && r.paye !== null && r.paye !== undefined
    ? Number(r.paye) : taxFor(r).paye);

  const editPaye = (id, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, paye: value, payeManual: true } : r)));

  const commitPaye = async (row) => {
    if (row.status !== "Draft") return;
    const paye = Math.max(0, Math.round(Number(row.paye) || 0));
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, paye, payeManual: true } : r)));
    setSaving(row.id);
    try { await saveBonusPayeManual(row.id, paye); }
    catch (e) { console.error(e); setError("Could not save that PAYE figure."); }
    finally { setSaving(null); }
  };

  // back to the formula
  const autoPaye = async (row) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, paye: null, payeManual: false } : r)));
    setSaving(row.id);
    try { await saveBonusPayeManual(row.id, null); }
    catch (e) { console.error(e); setError("Could not switch that PAYE back to the formula."); }
    finally { setSaving(null); }
  };

  const handleFinalise = async () => {
    if (!(await confirmDialog({
      title: `Finalise the ${monthLabel(month)} bonus sheet?`,
      message: "Amounts and PAYE can't be edited afterwards.",
      confirmLabel: "Finalise",
    }))) return;
    setBusy("Finalising…"); setError("");
    try {
      // typed figures are already stored and stay as they are
      await saveBonusPaye(rows.filter((r) => r.status === "Draft" && !isManual(r)).map((r) => ({ id: r.id, paye: taxFor(r).paye })));
      await finaliseBonuses(month);
      await load(month);
    }
    catch (e) { console.error(e); setError("Could not finalise the sheet."); }
    finally { setBusy(""); }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || (r.empName || "").toLowerCase().includes(q) || String(r.emp_id).includes(q);
  });
  const totalBonus = filtered.reduce((a, r) => a + (Number(r.bonusAmount) || 0), 0);
  // one month's salary less the bonus - what leave and lateness took off
  const deductionOf = (r) => Math.max(0, Number(r.basicSalary || 0) + Number(r.budgetaryAllowance || 0) - (Number(r.bonusAmount) || 0));
  const outdated = rows.filter((r) => r.status === "Draft" && basics[String(r.emp_id)] !== undefined
    && Math.round(basics[String(r.emp_id)]) !== Math.round(Number(r.basicSalary) || 0));
  const totalPaye  = filtered.reduce((a, r) => a + payeOf(r), 0);
  const ya = assessmentYear(month);
  const estimated = rows.some((r) => r.status === "Draft" && taxFor(r).estimatedMonths > 0);

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Bonus Sheet</h1>
            <p className="mt-1 text-sm text-gray-500">One month's salary — Basic + Budgetary Allowance, normally paid in December</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
            <StatusBadge color={finalised ? "success" : "warning"} className="px-3 py-1.5 text-sm font-semibold">
              {finalised ? "Finalised" : "Draft"}
            </StatusBadge>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <HiExclamation className="h-5 w-5 flex-shrink-0" /> {error}
          </div>
        )}

        {outdated.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            <HiExclamation className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span>
              <span className="font-semibold">{outdated.length}</span> employee{outdated.length === 1 ? "'s" : "s'"} basic
              salary has changed since this sheet was generated (e.g. {outdated[0].emp_id}: {money(outdated[0].basicSalary)} here,
              {" "}{money(basics[String(outdated[0].emp_id)])} now). Click <span className="font-semibold">Regenerate Sheet</span> before
              finalising — leave days, late days and any PAYE typed in will need entering again.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <CustomButton perm="bonus.edit" color="purple" disabled={!!busy || finalised} onClick={handleGenerate}>
            <HiRefresh className="mr-2 h-4 w-4" /> {rows.length ? "Regenerate Sheet" : "Generate Sheet"}
          </CustomButton>
          {!finalised && rows.length > 0 && (
            <CustomButton perm="bonus.finalise" color="success" disabled={!!busy} onClick={handleFinalise}>
              <HiCheck className="mr-2 h-4 w-4" /> Finalise Sheet
            </CustomButton>
          )}
          <CustomButton color="gray" outline disabled={rows.length === 0}
            onClick={() => downloadCSV(`bonus-${month}.csv`,
              rows.map((r) => ({ ...r, deduction: deductionOf(r), payeCalc: payeOf(r), payeHow: isManual(r) ? "Typed" : "Formula", netBonus: (Number(r.bonusAmount) || 0) - payeOf(r) })), [
              { key: "emp_id", label: "Emp ID" }, { key: "empName", label: "Employee" },
              { key: "category", label: "Category" }, { key: "basicSalary", label: "Basic" },
              { key: "budgetaryAllowance", label: "Budgetary" }, { key: "leaveDays", label: "Leave Days" },
              { key: "lateDays", label: "Late Days" }, { key: "deduction", label: "Deduction" }, { key: "bonusAmount", label: "Bonus" },
              { key: "payeCalc", label: "PAYE (Table 02)" }, { key: "payeHow", label: "PAYE entry" }, { key: "netBonus", label: "Net Bonus" },
            ])}>
            <HiDownload className="mr-2 h-4 w-4" /> Export CSV
          </CustomButton>
          <CustomInput icon={HiSearch} placeholder="Search name or ID..." sizing="sm" className="w-56"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {busy && <span className="text-sm text-gray-500">{busy}</span>}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="table-viewport">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>Employee</CustomTableHeadCell>
                  <CustomTableHeadCell>Category</CustomTableHeadCell>
                  <CustomTableHeadCell>Basic Salary</CustomTableHeadCell>
                  <CustomTableHeadCell>Budgetary Allow.</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Leave Days ✎</CustomTableHeadCell>
                  <CustomTableHeadCell>Leave Ded.</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Late Days ✎</CustomTableHeadCell>
                  <CustomTableHeadCell>Late Ded.</CustomTableHeadCell>
                  <CustomTableHeadCell>Deduction</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Bonus Amount ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-red-600" title="Worked out by Tax Table 02 - click ✎ to type a figure for someone whose monthly pay varies">PAYE (Table 02) ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-green-600">Net Bonus</CustomTableHeadCell>
                  <CustomTableHeadCell>Status</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={13} className="py-10 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : filtered.length === 0 ? (
                  <CustomTableRow><CustomTableCell colSpan={13} className="py-10 text-center text-sm text-gray-400">
                    No bonus sheet for {monthLabel(month)} yet — click <span className="font-semibold">Generate Sheet</span>.
                  </CustomTableCell></CustomTableRow>
                ) : filtered.map((r) => (
                  <CustomTableRow key={r.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell>
                      <p className="whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">{r.empName}</p>
                      <p className="font-mono text-xs text-purple-500">{r.emp_id}</p>
                    </CustomTableCell>
                    <CustomTableCell className="whitespace-nowrap text-xs text-gray-500">{r.category || "—"}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-700 dark:text-gray-300">{money(r.basicSalary)}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-700 dark:text-gray-300">{money(r.budgetaryAllowance)}</CustomTableCell>
                    <CustomTableCell>
                      {r.status === "Draft" && canEdit ? (
                        <input type="number" step="0.5" min="0" disabled={savingId === r.id}
                          value={r.leaveDays ?? 0}
                          onChange={(e) => editLeave(r.id, e.target.value)}
                          onBlur={() => commitLeave(r)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                          className="w-20 rounded border border-gray-300 bg-amber-50 px-2 py-1 text-sm text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
                      ) : (
                        <span className="text-sm text-gray-600">{Number(r.leaveDays || 0)}</span>
                      )}
                    </CustomTableCell>
                    {(() => {
                      const d = leaveDeduction(r.leaveDays, r.category);
                      return d.pct === null ? (
                        <CustomTableCell className="whitespace-nowrap text-xs font-semibold text-red-600" title={d.reason}>check</CustomTableCell>
                      ) : (
                        <CustomTableCell className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{d.pct ? `${d.pct}%` : "—"}</CustomTableCell>
                      );
                    })()}
                    <CustomTableCell>
                      {r.status === "Draft" && canEdit ? (
                        <input type="number" step="1" min="0" disabled={savingId === r.id}
                          value={r.lateDays ?? 0}
                          onChange={(e) => editLate(r.id, e.target.value)}
                          onBlur={() => commitLate(r)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                          className="w-20 rounded border border-gray-300 bg-amber-50 px-2 py-1 text-sm text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
                      ) : (
                        <span className="text-sm text-gray-600">{Number(r.lateDays || 0)}</span>
                      )}
                    </CustomTableCell>
                    {(() => {
                      const d = lateDeduction(r.lateDays, month);
                      return (
                        <CustomTableCell className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300" title={d.reason || undefined}>
                          {d.pct ? `${d.pct}%` : "—"}
                        </CustomTableCell>
                      );
                    })()}
                    <CustomTableCell className="whitespace-nowrap text-sm text-red-600">
                      {deductionOf(r) ? `− ${money(deductionOf(r))}` : "—"}
                    </CustomTableCell>
                    <CustomTableCell>
                      {r.status === "Draft" && canEdit ? (
                        <input type="number" step="0.01" min="0" disabled={savingId === r.id}
                          value={r.bonusAmount ?? 0}
                          onChange={(e) => editAmount(r.id, e.target.value)}
                          onBlur={() => commitAmount(r)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                          className="w-32 rounded border border-gray-300 bg-amber-50 px-2 py-1 text-sm font-semibold text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
                      ) : (
                        <span className="text-sm font-bold text-green-600">{money(r.bonusAmount)}</span>
                      )}
                    </CustomTableCell>
                    {(() => {
                      const t = taxFor(r);
                      const paye = payeOf(r);
                      return (<>
                        <CustomTableCell className="whitespace-nowrap text-sm text-red-600"
                          title={`Y/A ${ya.start} to ${ya.end}: A ${money(t.A)} + B ${money(t.B)} + C ${money(t.C)} = D ${money(t.D)}` +
                            ` · rate ${t.rate}% · monthly tax A ${money(t.taxA)}, B ${money(t.taxB)}` +
                            (t.estimatedMonths ? ` · ${t.estimatedMonths} month(s) estimated from the latest payroll` : "")}>
                          {r.status === "Draft" && canEdit && isManual(r) ? (
                            <span className="inline-flex items-center gap-1.5">
                              <input type="number" step="1" min="0" disabled={savingId === r.id}
                                value={r.paye ?? 0}
                                onChange={(e) => editPaye(r.id, e.target.value)}
                                onBlur={() => commitPaye(r)}
                                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                                className="w-24 rounded border border-amber-400 bg-amber-100 px-2 py-1 text-sm font-semibold text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
                              <span className="rounded bg-amber-200 px-1.5 text-[10px] font-semibold uppercase text-amber-900">manual</span>
                              <button type="button" disabled={savingId === r.id} onClick={() => autoPaye(r)}
                                title={`Back to the formula: ${money(t.paye)}`}
                                className="text-xs text-purple-600 underline hover:text-purple-800 disabled:opacity-50">Auto</button>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {money(paye)}
                              {r.status === "Draft" && t.estimatedMonths > 0 && <span className="text-[10px] text-gray-400">est.</span>}
                              {isManual(r) && (r.status === "Finalised" || !canEdit) && <span className="text-[10px] text-amber-700">manual</span>}
                              {r.status === "Draft" && canEdit && (
                                <button type="button" disabled={savingId === r.id} title="Type a PAYE figure for this person"
                                  onClick={() => commitPaye({ ...r, paye: t.paye })}
                                  className="ml-1 text-gray-400 hover:text-purple-600 disabled:opacity-50">✎</button>
                              )}
                            </span>
                          )}
                        </CustomTableCell>
                        <CustomTableCell className="whitespace-nowrap text-sm font-bold text-green-700">
                          {money((Number(r.bonusAmount) || 0) - paye)}
                        </CustomTableCell>
                      </>);
                    })()}
                    <CustomTableCell>
                      <StatusBadge color={r.status === "Finalised" ? "success" : "warning"} className="w-fit text-xs">{r.status}</StatusBadge>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </div>

          {filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-4 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-900/50 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Employees</p>
                <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{filtered.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Bonus Payable</p>
                <p className="text-lg font-bold text-green-600">Rs. {money(totalBonus)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total PAYE</p>
                <p className="text-lg font-bold text-red-600">Rs. {money(totalPaye)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Net Bonus</p>
                <p className="text-lg font-bold text-green-700">Rs. {money(totalBonus - totalPaye)}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <HiGift className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Amounts default to Basic + Budgetary Allowance, less the leave deduction for the leave days entered
            (leave from {bonusLeaveCycle(month).from} to {bonusLeaveCycle(month).to}, maternity leave not counted; administrative staff:
            full bonus up to 18 days, others up to 14). Rows marked "check" are over 28 days or have no category — the
            rule for those is still to be confirmed, so their amount is not changed.
            Late days come from the late days typed in each month's payroll ({bonusLateCycle(month, "").from} to {bonusLateCycle(month, "").to},
            administrative staff to {bonusLateCycle(month, "Administrative").to}; months before the system went live have to be typed in).
            {month < LATE_RULE_FROM
              ? " Under the memo of 9 September 2026 lateness first counts for the December 2027 bonus, so it does not change this sheet."
              : " Up to 18 late days: no deduction; 19 to 34: 20%; 35 or more: 50% — added to any leave deduction."}
            {" "}Amounts can be adjusted per employee before finalising.
            PAYE is the lump-sum tax from Inland Revenue Tax Table 02 for the year {ya.start} to {ya.end} — hover a
            figure to see how it was worked out. It is fixed when the sheet is finalised.
            {estimated && " Months before the system went live, and the months still to come, are estimated from each person's latest payroll month (marked est.)."}
            The bonus is recorded on this sheet only — it is not added to the monthly payroll run.
          </span>
        </div>
      </div>
    </Layout>
  );
}
