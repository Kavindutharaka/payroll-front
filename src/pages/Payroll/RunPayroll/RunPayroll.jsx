import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlay, HiRefresh, HiLockClosed, HiCheck, HiExclamation } from "react-icons/hi";
import { CustomSelect, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { fetchActiveEmployees } from "../../../services/employeeService";
import { fetchAllStructures } from "../../../services/salaryStructureService";
import { fetchLoans } from "../../../services/loanService";
import { fetchTaxSlabs } from "../../../services/taxService";
import { fetchEPFETFConfig } from "../../../services/epfEtfConfigService";
import {
  openRun, fetchRunDetails, clearRunDetails, refreshRunTotals,
  setRunStatus, insertRunDetailsBulk, computePayroll,
  updateRunDetail, recomputeDetailRow,
} from "../../../services/payrollRunService";

const statusSteps  = ["Draft", "Approved", "Paid"];
const statusColor  = { Draft: "warning", Approved: "indigo", Paid: "success" };
const DEFAULT_MODE = "Tax Table 1";
const money = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/* Editable per-month figure. Saves on blur (or Enter) so a 200-row
 * payroll isn't firing a request on every keystroke. */
function MonthlyInput({ row, field, locked, saving, onChange, onCommit }) {
  if (locked) {
    const v = Number(row[field] || 0);
    return <span className="text-sm text-gray-500">{v ? v.toLocaleString() : "—"}</span>;
  }
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      disabled={saving}
      value={row[field] ?? 0}
      onChange={(e) => onChange(row.id, field, e.target.value)}
      onBlur={() => onCommit(row)}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className="w-24 rounded border border-gray-300 bg-amber-50 px-2 py-1 text-sm text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
    />
  );
}

export default function RunPayroll() {
  const [month, setMonth]         = useState(thisMonth);
  const [run, setRun]             = useState(null);
  const [rows, setRows]           = useState([]);
  const [filterCat, setFilterCat] = useState("all");
  const [loading, setLoading]     = useState(false);
  const [busy, setBusy]           = useState("");
  const [error, setError]         = useState("");
  const [slabs, setSlabs]         = useState([]);
  const [rates, setRates]         = useState({});
  const [savingId, setSavingId]   = useState(null);

  const status    = run?.status ?? "Draft";
  const stepIndex = statusSteps.indexOf(status);
  const locked    = status === "Paid";

  /* ---------- load whatever already exists for the month ---------- */
  const loadRun = useCallback(async (m) => {
    setLoading(true); setError("");
    try {
      const head = await openRun(m);
      const r = Array.isArray(head) ? head[0] : head;
      setRun(r ?? null);
      setRows(r ? (await fetchRunDetails(r.id)) || [] : []);
    } catch (e) {
      console.error(e);
      setError("Could not load the payroll run for this month.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRun(month); }, [month, loadRun]);

  // Tax slabs + EPF rates are needed to re-run the engine when a figure is edited.
  useEffect(() => {
    Promise.all([fetchTaxSlabs(DEFAULT_MODE), fetchEPFETFConfig()])
      .then(([s, c]) => {
        setSlabs(Array.isArray(s) ? s : []);
        setRates((Array.isArray(c) ? c[0] : c) || {});
      })
      .catch(console.error);
  }, []);

  /* ---------- edit a monthly figure ---------- */
  const editField = (rowId, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
  };

  const commitField = async (row) => {
    if (locked) return;
    setSavingId(row.id);
    try {
      const calc = recomputeDetailRow(row, slabs, rates);
      const merged = { ...row, ...calc };
      setRows((prev) => prev.map((r) => (r.id === row.id ? merged : r)));
      await updateRunDetail(row.id, merged);
      await refreshRunTotals(run.id);
    } catch (e) {
      console.error(e);
      setError("Could not save that change.");
    } finally {
      setSavingId(null);
    }
  };

  /* ---------- calculate ---------- */
  const handleCalculate = async () => {
    if (locked) return;
    setBusy("Calculating…"); setError("");
    try {
      const [emps, structures, loans, slabList, cfgRaw] = await Promise.all([
        fetchActiveEmployees(),
        fetchAllStructures(),
        fetchLoans(),
        fetchTaxSlabs(DEFAULT_MODE),
        fetchEPFETFConfig(),
      ]);
      const employees = Array.isArray(emps) ? emps : [];
      const cfg = Array.isArray(cfgRaw) ? cfgRaw[0] : cfgRaw;

      // Keep anything already typed in for this month so recalculating
      // doesn't wipe the No Pay / allowance / advance figures.
      const keep = {};
      rows.forEach((r) => {
        keep[String(r.emp_id)] = {
          noPay:            Number(r.noPay || 0),
          otherAllowance:   Number(r.otherAllowance || 0),
          advanceDeduction: Number(r.advanceDeduction || 0),
          edited: true,
        };
      });

      // group salary structure by employee
      const byEmp = {};
      (Array.isArray(structures) ? structures : []).forEach((s) => {
        (byEmp[String(s.emp_id)] ??= []).push(s);
      });

      // active loan installments per employee
      const loanByEmp = {};
      (Array.isArray(loans) ? loans : [])
        .filter((l) => l.status === "Active")
        .forEach((l) => {
          const k = String(l.emp_id);
          loanByEmp[k] = (loanByEmp[k] || 0) + Number(l.monthlyInstallment || 0);
        });

      const computed = employees.map((e) => {
        const comps = byEmp[String(e.emp_id)] ?? [];
        let budgetary = 0, other = 0, insurance = 0, otherDed = 0;

        comps.forEach((c) => {
          const val  = Number(c.value || 0);
          const name = (c.componentName || "").toLowerCase();
          if (c.type === "Allowance") {
            // only the budgetary allowance counts toward the EPF base
            if (name.includes("budgetary")) budgetary += val;
            else                            other     += val;
          } else if (c.type === "Deduction") {
            if (name.includes("insurance")) insurance += val;
            else                            otherDed  += val;
          }
          // "Employer Contribution" rows are never taken off the employee
        });

        const prev = keep[String(e.emp_id)];
        const calc = computePayroll(
          {
            basicSalary: e.basicSalary,
            noPay: prev?.noPay ?? 0,                          // monthly input
            budgetaryAllowance: budgetary,
            otherAllowance: prev?.edited ? prev.otherAllowance : other,
            loanDeduction: loanByEmp[String(e.emp_id)] || 0,
            advanceDeduction: prev?.advanceDeduction ?? 0,    // monthly input
            insuranceDeduction: insurance,
            otherDeduction: otherDed,
            epfEtf: !!e.epfEtf,
          },
          Array.isArray(slabList) ? slabList : [],
          cfg || {}
        );

        return {
          ...calc,
          emp_id: e.emp_id,
          empName: `${e.initial ?? ""} ${e.firstName ?? ""} ${e.surName ?? ""}`.replace(/\s+/g, " ").trim(),
          category: e.category ?? "",
          epfEtf: !!e.epfEtf,
        };
      });

      await clearRunDetails(run.id);
      await insertRunDetailsBulk(run.id, month, computed);
      await refreshRunTotals(run.id);
      await loadRun(month);
    } catch (e) {
      console.error(e);
      setError("Calculation failed. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const changeStatus = async (next) => {
    setBusy("Updating…");
    try { await setRunStatus(run.id, next); await loadRun(month); }
    catch (e) { console.error(e); setError("Could not update the payroll status."); }
    finally { setBusy(""); }
  };

  const filtered = rows.filter((r) => filterCat === "all" || (r.category || "").includes(filterCat));

  const totals = filtered.reduce((a, r) => ({
    gross:      a.gross      + Number(r.grossPay || 0),
    deductions: a.deductions + Number(r.totalDeductions || 0),
    epf:        a.epf        + Number(r.epfEmployee || 0) + Number(r.epfEmployer || 0) + Number(r.etf || 0),
    net:        a.net        + Number(r.netPay || 0),
  }), { gross: 0, deductions: 0, epf: 0, net: 0 });

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Run Payroll</h1>
            <p className="mt-1 text-sm text-gray-500">Calculate, approve and lock monthly payroll</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
            <CustomSelect sizing="sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="Main">Main School</option>
              <option value="Battaramulla">Battaramulla</option>
            </CustomSelect>
            <StatusBadge color={statusColor[status]} className="px-3 py-1.5 text-sm font-semibold">{status}</StatusBadge>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <HiExclamation className="h-5 w-5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Progress */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            {statusSteps.map((step, idx) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  idx < stepIndex   ? "bg-green-500 text-white" :
                  idx === stepIndex ? "bg-purple-600 text-white" :
                                      "bg-gray-200 text-gray-400 dark:bg-gray-600"
                }`}>
                  {idx < stepIndex ? <HiCheck className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={`text-sm font-medium ${idx === stepIndex ? "text-purple-600" : "text-gray-400"}`}>{step}</span>
                {idx < statusSteps.length - 1 && <div className={`h-0.5 w-12 ${idx < stepIndex ? "bg-green-400" : "bg-gray-200 dark:bg-gray-600"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <CustomButton color="purple" disabled={!run || !!busy || locked} onClick={handleCalculate}>
            <HiPlay className="mr-2 h-4 w-4" /> {rows.length ? "Recalculate" : "Calculate"}
          </CustomButton>
          {status === "Draft" && rows.length > 0 && (
            <CustomButton color="indigo" disabled={!!busy} onClick={() => changeStatus("Approved")}>
              <HiCheck className="mr-2 h-4 w-4" /> Approve Payroll
            </CustomButton>
          )}
          {status === "Approved" && (
            <>
              <CustomButton color="success" disabled={!!busy} onClick={() => changeStatus("Paid")}>
                <HiLockClosed className="mr-2 h-4 w-4" /> Lock &amp; Mark as Paid
              </CustomButton>
              <CustomButton color="gray" outline disabled={!!busy} onClick={() => changeStatus("Draft")}>
                <HiRefresh className="mr-2 h-4 w-4" /> Back to Draft
              </CustomButton>
            </>
          )}
          {busy && <span className="text-sm text-gray-500">{busy}</span>}
          {locked && <span className="text-sm text-gray-500">This payroll is locked and cannot be changed.</span>}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>Employee</CustomTableHeadCell>
                  <CustomTableHeadCell>Basic</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">No Pay ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Allowances ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Advance ✎</CustomTableHeadCell>
                  <CustomTableHeadCell>Gross</CustomTableHeadCell>
                  <CustomTableHeadCell>PAYE</CustomTableHeadCell>
                  <CustomTableHeadCell>EPF 8% (Ee)</CustomTableHeadCell>
                  <CustomTableHeadCell>Deductions</CustomTableHeadCell>
                  <CustomTableHeadCell>EPF 12% (Er)</CustomTableHeadCell>
                  <CustomTableHeadCell>ETF 3%</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-green-600">Net Salary</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={12} className="py-10 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : filtered.length === 0 ? (
                  <CustomTableRow>
                    <CustomTableCell colSpan={12} className="py-10 text-center text-sm text-gray-400">
                      No payroll calculated for this month yet — click <span className="font-semibold">Calculate</span> to generate it.
                    </CustomTableCell>
                  </CustomTableRow>
                ) : filtered.map((r) => (
                  <CustomTableRow key={r.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell>
                      <p className="whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">{r.empName}</p>
                      <div className="mt-0.5 flex gap-1">
                        <StatusBadge color="indigo" className="text-xs">{r.emp_id}</StatusBadge>
                        {r.category && <StatusBadge color="purple" className="text-xs">{r.category}</StatusBadge>}
                      </div>
                    </CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-700 dark:text-gray-300">{money(r.basicSalary)}</CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="noPay" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="otherAllowance" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                      {Number(r.budgetaryAllowance) > 0 && (
                        <p className="mt-0.5 text-[10px] text-gray-400">+ {money(r.budgetaryAllowance)} budgetary</p>
                      )}
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="advanceDeduction" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>
                    <CustomTableCell className="text-sm font-semibold text-gray-800 dark:text-gray-200">{money(r.grossPay)}</CustomTableCell>
                    <CustomTableCell className="text-sm text-red-500">{Number(r.paye) ? money(r.paye) : "—"}</CustomTableCell>
                    <CustomTableCell className="text-sm text-orange-500">{money(r.epfEmployee)}</CustomTableCell>
                    <CustomTableCell className="text-sm text-red-500">{money(r.totalDeductions)}</CustomTableCell>
                    <CustomTableCell className="text-sm text-orange-400">{money(r.epfEmployer)}</CustomTableCell>
                    <CustomTableCell className="text-sm text-orange-300">{money(r.etf)}</CustomTableCell>
                    <CustomTableCell className="whitespace-nowrap text-sm font-bold text-green-600">Rs. {money(r.netPay)}</CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </div>

          {filtered.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-900/50 sm:grid-cols-4">
                {[
                  { label: "Total Gross",       value: totals.gross,      color: "text-gray-700 dark:text-gray-200" },
                  { label: "Total Deductions",  value: totals.deductions, color: "text-red-600" },
                  { label: "Total EPF/ETF",     value: totals.epf,        color: "text-orange-600" },
                  { label: "Total Net Payable", value: totals.net,        color: "text-green-600" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>Rs. {money(value)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 px-5 py-3 text-xs text-gray-400 dark:border-gray-700">
                {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
                {run?.calculatedAt && ` · last calculated ${new Date(run.calculatedAt).toLocaleString()}`}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
