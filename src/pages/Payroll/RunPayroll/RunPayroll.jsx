import { useState, useEffect, useCallback, useRef } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlay, HiRefresh, HiLockClosed, HiCheck, HiExclamation, HiDownload, HiUpload, HiSearch } from "react-icons/hi";
import { CustomSelect, CustomButton, CustomInput } from "../../../components/FormFields";
import { sheetClasses as sheet } from "../../../ui/tableConfig";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { fetchActiveEmployees } from "../../../services/employeeService";
import { fetchAllStructures, componentPaysIn } from "../../../services/salaryStructureService";
import { fetchLoans, installmentFor } from "../../../services/loanService";
import { fetchIncrementsForMonth } from "../../../services/incrementBonusService";
import { fetchNoPayDaysForMonth } from "../../../services/leaveService";
import { fetchTaxSlabs } from "../../../services/taxService";
import { fetchEPFETFConfig } from "../../../services/epfEtfConfigService";
import { downloadCSV } from "../../../services/reportService";
import { displayName } from "../Payslip/Payslip";
import {
  openRun, fetchRunDetails, refreshRunTotals, countExpectedForPeriod, fetchOpenPayrollMonth,
  setRunStatus, replaceRunDetails, computePayroll,
  updateRunDetail, recomputeDetailRow, resolveComponentValue,
  noPayFromDays, DAYS_IN_MONTH, setRunPeriod, fetchPeriodEmployees,
  BULK_FIELDS, parseBulkCsv, applyBulkUpdates, countStructureChangesSince, countRevokedIncrements,
} from "../../../services/payrollRunService";
import { useCan } from "../../../auth/AuthContext";
import { freshReads } from "../../../services/api";

const statusSteps  = ["Draft", "Approved", "Paid"];
const statusColor  = { Draft: "warning", Approved: "indigo", Paid: "success" };
const DEFAULT_MODE = "Tax Table 1";
const money = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/* Cash and cheque staff are paid outside the bulk transfer file. */
const isBankPaid = (r) => String(r.paymentMode || "Bank") === "Bank";

/* These figures exist nowhere but this grid — the attendance allowance is worked
 * out from last month's attendance, salary advances are agreed ad hoc, late days
 * come off a register. Rebuilding from the salary structure cannot recreate them,
 * so a rebuild must never discard them: in August that would have silently
 * removed Rs. 305,615 of attendance allowance from 46 people's bank transfers. */
const TYPED_ONLY = ["attendanceAllowance", "lateDays", "advanceDeduction", "salaryAdjustment"];

/* Editable per-month figure. Saves on blur (or Enter) so a 200-row
 * payroll isn't firing a request on every keystroke. */
function MonthlyInput({ row, field, locked, saving, onChange, onCommit, width = "w-24", allowNegative = false }) {
  if (locked) {
    const v = Number(row[field] || 0);
    return <span className="text-sm text-gray-500">{v ? v.toLocaleString() : "—"}</span>;
  }
  // A typed figure overrides whatever the salary structure says, so it is marked —
  // otherwise there is no way to tell it apart from a calculated one.
  const overridden = String(row.editedFields || "").split(",").includes(field);
  return (
    <span className="relative inline-block">
    {overridden && (
      <span title="Typed by hand — this figure ignores the salary structure until you rebuild"
        className="absolute -right-1 -top-1 z-10 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-gray-800" />
    )}
    <input
      type="number"
      step="0.01"
      min={allowNegative ? undefined : "0"}
      disabled={saving}
      value={row[field] ?? 0}
      onChange={(e) => onChange(row.id, field, e.target.value)}
      onBlur={() => onCommit(row)}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className={`${width} rounded border ${overridden ? "border-amber-400 bg-amber-100 font-semibold" : "border-gray-300 bg-amber-50"} px-2 py-1 text-sm text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100`}
    />
    </span>
  );
}

export default function RunPayroll() {
  // null until the open payroll month is known - October's payroll is finished in
  // November, so opening on the calendar month showed an empty November run
  const [month, setMonth]         = useState(null);
  useEffect(() => {
    fetchOpenPayrollMonth().then((m) => setMonth(m || thisMonth())).catch(() => setMonth(thisMonth()));
  }, []);
  const [run, setRun]             = useState(null);
  const [rows, setRows]           = useState([]);
  const [filterCat, setFilterCat] = useState("all");
  const [loading, setLoading]     = useState(false);
  const [busy, setBusy]           = useState("");
  const [error, setError]         = useState("");
  const [slabs, setSlabs]         = useState([]);
  const [rates, setRates]         = useState({});
  const [savingId, setSavingId]   = useState(null);
  const [notice, setNotice]       = useState("");
  const [stale, setStale]         = useState(0);
  const [revoked, setRevoked]     = useState(0);   // increments revoked and not yet applied again
  const [askRebuild, setAskRebuild] = useState(false);
  const [staffType, setStaffType] = useState("all");
  const [page, setPage]           = useState(1);
  const [pFrom, setPFrom]         = useState("");
  const [pTo, setPTo]             = useState("");
  const [expected, setExpected]   = useState(0);   // staff employed in the period - a run with fewer is incomplete
  const [query, setQuery]         = useState("");
  const [perPage, setPerPage]     = useState("25");

  const status    = run?.status ?? "Draft";
  const stepIndex = statusSteps.indexOf(status);
  const can       = useCan();
  const viewOnly  = !can("payroll.calculate");
  const locked    = status === "Paid" || viewOnly;

  /* ---------- load whatever already exists for the month ---------- */
  /* Loading a month takes a moment, and until it lands the screen still holds the
   * previous month's run. On 12 Sep a recalculate in that gap wrote August's
   * figures into September's run, leaving every September report empty and the
   * August ones counted twice. So a switch drops the old run straight away, and
   * a slow answer for a month no longer selected is thrown away. */
  const loadSeq = useRef(0);
  const loadRun = useCallback(async (m) => {
    const seq = ++loadSeq.current;
    setLoading(true); setError("");
    setRun((cur) => (cur && cur.runMonth !== m ? null : cur));
    try {
      // the payroll sheet always shows live figures, never the 30-second read cache
      const head = await freshReads(() => openRun(m));
      const r = Array.isArray(head) ? head[0] : head;
      // side by side, not one after another: each request costs about a second
      // before any data moves, so five in a row kept the screen blank for 8-9 s
      const [details, changes, pending, should] = await freshReads(() => Promise.all([
        r ? fetchRunDetails(r.id).then((d) => d || []) : [],
        r ? countStructureChangesSince(m).catch(() => 0) : 0,
        countRevokedIncrements(m).catch(() => 0),
        r?.periodFrom && r?.periodTo
          ? countExpectedForPeriod(String(r.periodFrom).slice(0, 10), String(r.periodTo).slice(0, 10)).catch(() => 0)
          : 0,
      ]));
      if (seq !== loadSeq.current) return;   // another month was picked meanwhile
      setRun(r ?? null);
      setPFrom(r?.periodFrom ? String(r.periodFrom).slice(0, 10) : "");
      setPTo(r?.periodTo ? String(r.periodTo).slice(0, 10) : "");
      setRows(details);
      setStale(changes);
      setRevoked(pending);
      setExpected(should);
    } catch (e) {
      console.error(e);
      if (seq === loadSeq.current) setError("Could not load the payroll run for this month.");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, []);

  // true only when the run on screen belongs to the month in the picker
  const runIsCurrent = Boolean(run) && run.runMonth === month && !loading;

  useEffect(() => { if (month) loadRun(month); }, [month, loadRun]);
  useEffect(() => { setPage(1); }, [month, filterCat, staffType, query, perPage]);

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
    setRows((prev) => prev.map((r) => {
      if (r.id !== rowId) return r;
      // remember which figures were typed so a recalculate keeps them
      const touched = new Set(String(r.editedFields || "").split(",").filter(Boolean));
      touched.add(field);
      return { ...r, [field]: value, editedFields: [...touched].join(",") };
    }));
  };

  /* The run's stored totals only feed the dashboard and summaries - the grid adds
   * its own - so they are refreshed once typing pauses rather than after every
   * figure, which had each row's boxes locked for two round trips. */
  const totalsTimer = useRef(null);
  const totalsFor   = useRef(null);   // the run still waiting for its totals
  const flushTotals = () => {
    clearTimeout(totalsTimer.current);
    if (totalsFor.current) { refreshRunTotals(totalsFor.current).catch(console.error); totalsFor.current = null; }
  };
  const refreshTotalsSoon = (runId) => {
    clearTimeout(totalsTimer.current);
    totalsFor.current = runId;
    totalsTimer.current = setTimeout(flushTotals, 2000);
  };
  // leaving the page, or changing month, never skips the refresh
  useEffect(() => flushTotals, [month]);   // eslint-disable-line react-hooks/exhaustive-deps

  const commitField = async (row) => {
    if (locked) return;
    setSavingId(row.id);
    try {
      const calc = recomputeDetailRow(row, slabs, rates);
      const merged = { ...row, ...calc };
      setRows((prev) => prev.map((r) => (r.id === row.id ? merged : r)));
      await updateRunDetail(row.id, merged);
      refreshTotalsSoon(run.id);
    } catch (e) {
      console.error(e);
      setError("Could not save that change.");
    } finally {
      setSavingId(null);
    }
  };

  const savePeriod = async () => {
    if (!run || locked) return;
    if (pFrom && pTo && pFrom > pTo) { setError("The period start must be before the end."); return; }
    setBusy("Saving period…"); setError("");
    try { await setRunPeriod(run.id, pFrom, pTo); await loadRun(month); }
    catch (e) { console.error(e); setError("Could not save the pay period."); }
    finally { setBusy(""); }
  };

  /* ---------- bulk edit via Excel ---------- */
  // Nadee works in Excel, so exporting the sheet, filling it there and
  // importing it back beats typing ~180 boxes by hand each month.
  const exportForEditing = () => {
    if (rows.length === 0) return;
    downloadCSV(`payroll-${month}-entry.csv`, rows, [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "basicSalary", label: "Basic Salary" },
      ...BULK_FIELDS.map((f) => ({ key: f.key, label: f.label })),
    ]);
    setNotice("Sheet exported. Fill in the columns, save as CSV, then use Import.");
  };

  const importEdited = async (file) => {
    if (!file || locked) return;
    setBusy("Reading file…"); setError(""); setNotice("");
    try {
      const text = await file.text();
      const { updates, notFound, unchanged, error: parseError } = parseBulkCsv(text, rows);
      if (parseError) { setError(parseError); return; }
      if (updates.length === 0) {
        setNotice(`Nothing to change — ${unchanged} row${unchanged === 1 ? "" : "s"} already match the file.`);
        return;
      }
      setBusy(`Updating ${updates.length} employees…`);
      await applyBulkUpdates(updates, slabs, rates);
      await refreshRunTotals(run.id);
      await loadRun(month);
      setNotice(
        `Updated ${updates.length} employee${updates.length === 1 ? "" : "s"}` +
        (unchanged ? `, ${unchanged} unchanged` : "") +
        (notFound.length ? `. Not found in this payroll: ${notFound.slice(0, 5).join(", ")}${notFound.length > 5 ? "…" : ""}` : ".")
      );
    } catch (e) {
      console.error(e);
      setError("Could not read that file. Save it as CSV and try again.");
    } finally { setBusy(""); }
  };

  /* ---------- calculate ---------- */
  /* A figure typed into the grid is remembered so a recalculate does not wipe it.
   * That is right until the salary structure changes underneath it — then the
   * typed number silently masks the new one, which is how emp 327 kept showing
   * 5,000 while the structure said 10,000. So recalculating now asks which the
   * user meant: keep the typed figures, or rebuild everything from the structure. */
  const handleCalculate = async (mode = "keep") => {
    if (locked || !runIsCurrent) return;
    setBusy("Calculating…"); setError("");
    try {
      // live figures, never the 30-second read cache - a payroll is calculated from these
      const [emps, structures, loans, slabList, cfgRaw, incs, noPayLeave, periodEmps] = await freshReads(() => Promise.all([
        fetchActiveEmployees(),
        fetchAllStructures(),
        fetchLoans(),
        fetchTaxSlabs(DEFAULT_MODE),
        fetchEPFETFConfig(),
        fetchIncrementsForMonth(month),
        fetchNoPayDaysForMonth(month),
        fetchPeriodEmployees(pFrom || `${month}-01`, pTo || `${month}-31`),
      ]));
      // employment inside the pay period — someone who joined or left partway
      // through only gets paid for the days they were actually employed
      const periodByEmp = {};
      (Array.isArray(periodEmps) ? periodEmps : []).forEach((x) => {
        periodByEmp[String(x.emp_id)] = x;
      });

      // approved no-pay leave pre-fills the No Pay days
      const leaveDaysByEmp = {};
      (Array.isArray(noPayLeave) ? noPayLeave : []).forEach((l) => {
        leaveDaysByEmp[String(l.emp_id)] = Number(l.noPayDays || 0);
      });

      // an increment applied for this month shows as its own line
      const incByEmp = {};
      (Array.isArray(incs) ? incs : []).forEach((i) => {
        incByEmp[String(i.emp_id)] = (incByEmp[String(i.emp_id)] || 0) + Number(i.incrementAmount || 0);
      });
      const employees = Array.isArray(emps) ? emps : [];
      const cfg = Array.isArray(cfgRaw) ? cfgRaw[0] : cfgRaw;

      // Recalculating must keep what the user typed but still pick up anything
      // newly added to the salary structure. Only fields recorded in
      // editedFields count as typed — assuming every existing row was edited
      // meant new allowances never came through.
      const keep = {};
      rows.forEach((r) => {
        const typed = String(r.editedFields || "").split(",").filter(Boolean);
        const touched = mode === "fresh"
          ? typed.filter((f) => TYPED_ONLY.includes(f))   // only what a rebuild can regenerate
          : typed;
        keep[String(r.emp_id)] = {
          editedFields:        touched,
          was:                 (f) => touched.includes(f),
          noPay:               Number(r.noPay || 0),
          noPayDays:           Number(r.noPayDays || 0),
          increment:           Number(r.increment || 0),
          salaryAdjustment:    Number(r.salaryAdjustment || 0),
          festivalAdvance:     Number(r.festivalAdvance || 0),
          attendanceAllowance: Number(r.attendanceAllowance || 0),
          lateDays:            Number(r.lateDays || 0),
          otherAllowance:      Number(r.otherAllowance || 0),
          advanceDeduction:    Number(r.advanceDeduction || 0),
          loanDeduction:       Number(r.loanDeduction || 0),
          insuranceDeduction:  Number(r.insuranceDeduction || 0),
          otherDeduction:      Number(r.otherDeduction || 0),
        };
      });
      const kept = (p, f, fallback) => (p?.was?.(f) ? p[f] : fallback);

      // group salary structure by employee - only the components this month pays,
      // which the Effective From / To dates decide (see componentPaysIn)
      const byEmp = {};
      (Array.isArray(structures) ? structures : [])
        .filter((s) => componentPaysIn(s, run.runMonth))
        .forEach((s) => {
          (byEmp[String(s.emp_id)] ??= []).push(s);
        });

      // Active loan installments, routed to the deduction line the loan type is
      // linked to. Where no link is set we still fall back to reading the type's
      // name, so types configured before the link existed keep working.
      const loanByEmp = {}, festivalByEmp = {}, advanceByEmp = {}, insuranceByEmp = {};
      const bucketFor = (l) => {
        const link = String(l.linkedComponent || "").toLowerCase();
        if (link) {
          if (link.includes("festival"))  return festivalByEmp;
          if (link.includes("advance"))   return advanceByEmp;
          if (link.includes("insurance")) return insuranceByEmp;
          return loanByEmp;
        }
        return (l.loanType || "").toLowerCase().includes("festival") ? festivalByEmp : loanByEmp;
      };
      (Array.isArray(loans) ? loans : [])
        .filter((l) => l.status === "Active")
        .forEach((l) => {
          const k = String(l.emp_id);
          const bucket = bucketFor(l);
          // this month's installment - nothing before the start, the balance on the last
          bucket[k] = (bucket[k] || 0) + installmentFor(l, month);
        });

      const computed = employees.filter((e) => periodByEmp[String(e.emp_id)]).map((e) => {
        const comps = byEmp[String(e.emp_id)] ?? [];
        const prev  = keep[String(e.emp_id)];
        let budgetary = 0, increment = 0, formTeacher = 0, other = 0, insurance = 0, festival = 0, otherDed = 0;
        const parts = [];   // named allowances, printed small under the total

        // the component's calculation type decides what its number means:
        // a fixed amount, a percentage of basic/gross, or a formula
        const basic = Number(e.basicSalary) || 0;
        const bud0  = comps
          .filter((c) => c.type === "Allowance" && (c.componentName || "").toLowerCase().includes("budgetary"))
          .reduce((a, c) => a + (Number(c.value) || 0), 0);
        // Give formulas the real figures for this employee and month, not zeros.
        // The increment used here is the one applied from the Increment Sheet;
        // an increment coming from the structure itself would be circular.
        const ctxIncrement = incByEmp[String(e.emp_id)] || 0;
        // days not employed in the period count the same way as no-pay days
        const pe = periodByEmp[String(e.emp_id)];
        const unworked = pe
          ? Math.max(0, Number(pe.daysInPeriod || 0) - Number(pe.daysEmployed || 0))
          : 0;
        const ctxNoPayDays = kept(prev, "noPayDays",
          (leaveDaysByEmp[String(e.emp_id)] ?? 0) + unworked);
        const ctxNoPay     = kept(prev, "noPay", noPayFromDays(ctxNoPayDays, basic, bud0, ctxIncrement));
        const ctx = {
          basic,
          budgetary: bud0,
          increment: ctxIncrement,
          noPay:     ctxNoPay,
          noPayDays: ctxNoPayDays,
          baseGross: basic - ctxNoPay + bud0 + ctxIncrement,
          days:      DAYS_IN_MONTH,
          hours:     0,   // no OT-hours capture yet — see the formula guide
        };

        comps.forEach((c) => {
          const val  = resolveComponentValue(c, ctx);
          const name = (c.componentName || "").toLowerCase();
          if (c.type === "Allowance") {
            // budgetary allowance and increment both count toward the EPF base,
            // and each gets its own line on the payslip
            if      (name.includes("budgetary"))    budgetary   += val;
            else if (name.includes("increment"))    increment   += val;
            else if (name.includes("form teacher")) formTeacher += val;
            else {
              other += val;
              if (val > 0) parts.push(`${c.componentName} ${Math.round(val).toLocaleString()}`);
            }
          } else if (c.type === "Deduction") {
            if      (name.includes("insurance")) insurance += val;
            else if (name.includes("festival"))  festival  += val;
            else                                 otherDed  += val;
          }
          // "Employer Contribution" rows are never taken off the employee
        });

        const calc = computePayroll(
          {
            basicSalary: e.basicSalary,
            noPay: kept(prev, "noPay", ctxNoPay),
            noPayAmountEdited: !!prev?.was?.("noPay"),
            noPayDays: ctxNoPayDays,
            budgetaryAllowance: budgetary,
            increment: kept(prev, "increment", increment + (incByEmp[String(e.emp_id)] || 0)),
            otherAllowance: kept(prev, "otherAllowance", other),
            loanDeduction: kept(prev, "loanDeduction", loanByEmp[String(e.emp_id)] || 0),
            advanceDeduction: kept(prev, "advanceDeduction", advanceByEmp[String(e.emp_id)] || 0),
            festivalAdvance: kept(prev, "festivalAdvance", festival + (festivalByEmp[String(e.emp_id)] || 0)),
            insuranceDeduction: kept(prev, "insuranceDeduction", insurance + (insuranceByEmp[String(e.emp_id)] || 0)),
            otherDeduction: kept(prev, "otherDeduction", otherDed),
            attendanceAllowance: kept(prev, "attendanceAllowance", 0),
            salaryAdjustment: kept(prev, "salaryAdjustment", 0),
            formTeacherAllowance: formTeacher,
            lateDays: kept(prev, "lateDays", 0),
            taxMode: e.taxMode,
            epfEtf: !!e.epfEtf,
          },
          Array.isArray(slabList) ? slabList : [],
          cfg || {}
        );

        return {
          ...calc,
          emp_id: e.emp_id,
          // one name format across payslip, grid and every report: "Mrs.S.R Fernando"
          empName: `${e.initial ?? ""}${e.initials ?? ""} ${e.surName ?? ""}`.replace(/\s+/g, " ").trim(),
          category: e.category ?? "",
          allowanceBreakdown: parts.slice(0, 5).join("  ·  ") || null,
          editedFields: (prev?.editedFields ?? []).join(","),
          epfEtf: !!e.epfEtf,
        };
      });

      // all rows in one go: either the whole new calculation is saved or nothing changes
      await replaceRunDetails(run.id, run.runMonth, computed);   // the run's own month, never the picker's
      await refreshRunTotals(run.id);
      await loadRun(month);
    } catch (e) {
      console.error(e);
      // reload so the grid shows what is really saved, whichever way the save went
      await loadRun(month);
      setError("The calculation could not be saved. The figures below are what is saved now — please try again.");
    } finally {
      setBusy("");
    }
  };

  const changeStatus = async (next) => {
    setBusy("Updating…");
    if (!runIsCurrent) return;
    flushTotals();   // approve on the latest totals
    try { await setRunStatus(run.id, next); await loadRun(month); }
    catch (e) { console.error(e); setError("Could not update the payroll status."); }
    finally { setBusy(""); }
  };

  const typedFields = rows.flatMap((r) =>
    String(r.editedFields || "").split(",").filter(Boolean).map((f) => ({ f, r })));
  const overrideCount  = typedFields.length;
  const overriddenRows = rows.filter((r) => String(r.editedFields || "").trim()).length;
  const rebuildable    = typedFields.filter(({ f }) => !TYPED_ONLY.includes(f));
  const protectedOnes  = typedFields.filter(({ f }) => TYPED_ONLY.includes(f));
  const protectedTotal = protectedOnes.reduce((n, { f, r }) => n + (Number(r[f]) || 0), 0);

  /* Coaches and other contractors get no EPF/ETF and are paid on their own date
   * once sports attendance is in, so Nadee runs them apart from permanent staff.
   * Directors stay with the permanent run — they are paid at month end with
   * everyone else. */
  // "Permanent Staff on Contract" are permanent staff past 55 and run with them;
  // the contract run is for contractors and contract staff
  const isContract = (r) => {
    const t = String(r.employmentType || "");
    return /contract/i.test(t) && !/permanent/i.test(t);
  };
  const matchesStaffType = (r) =>
    staffType === "all" ||
    (staffType === "contract" ? isContract(r) : !isContract(r));

  // a number is an EPF number, matched whole - 327 must not also find 1327
  const q = query.trim().toLowerCase();
  const matchesQuery = (r) => !q || (/^\d+$/.test(q)
    ? String(r.emp_id) === q
    : `${displayName(r)} ${r.empName || ""}`.toLowerCase().includes(q));

  const filtered = rows.filter(
    (r) => (filterCat === "all" || (r.category || "").includes(filterCat)) && matchesStaffType(r) && matchesQuery(r));
  const missingRows = !locked && rows.length > 0 && expected > rows.length ? expected - rows.length : 0;

  // "All" puts the whole payroll on one page for checking it through
  const PER_PAGE = perPage === "all" ? Math.max(1, filtered.length) : Number(perPage);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current   = Math.min(page, pageCount);
  const visible   = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const totals = filtered.reduce((a, r) => ({
    gross:      a.gross      + Number(r.grossPay || 0),
    deductions: a.deductions + Number(r.totalDeductions || 0),
    epf:        a.epf        + Number(r.epfEmployee || 0) + Number(r.epfEmployer || 0) + Number(r.etf || 0),
    net:        a.net        + Number(r.netPay || 0),
    transfer:   a.transfer   + (isBankPaid(r) ? Number(r.netPay || 0) + Number(r.attendanceAllowance || 0) : 0),
    attendance: a.attendance + Number(r.attendanceAllowance || 0),
  }), { gross: 0, deductions: 0, epf: 0, net: 0, transfer: 0, attendance: 0 });

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Run Payroll</h1>
            <p className="mt-1 text-sm text-gray-500">Calculate, approve and lock monthly payroll</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="month" value={month || ""} onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
            <CustomSelect sizing="sm" value={staffType} onChange={(e) => setStaffType(e.target.value)}>
              <option value="all">All Staff</option>
              <option value="permanent">Permanent Staff</option>
              <option value="contract">Contract Staff</option>
            </CustomSelect>
            <CustomSelect sizing="sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="Main">Main School</option>
              <option value="Battaramulla">Battaramulla</option>
            </CustomSelect>
            <StatusBadge color={statusColor[status]} className="px-3 py-1.5 text-sm font-semibold">{status}</StatusBadge>
          </div>
        </div>

        {/* Workflow: where this payroll is, what to do next, and its pay period - one card,
            so the sheet below gets the height */}
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Payroll progress">
              {statusSteps.map((step, idx) => (
                <li key={step} className="flex items-center gap-1.5 sm:gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    idx < stepIndex   ? "bg-green-500 text-white" :
                    idx === stepIndex ? "bg-purple-600 text-white ring-4 ring-purple-100 dark:ring-purple-900/50" :
                                        "bg-gray-200 text-gray-400 dark:bg-gray-600"
                  }`}>
                    {idx < stepIndex ? <HiCheck className="h-4 w-4" /> : idx + 1}
                  </span>
                  <span className={`text-sm font-medium ${idx === stepIndex ? "text-purple-600 dark:text-purple-300" : "text-gray-400"}`}>{step}</span>
                  {idx < statusSteps.length - 1 && <span className={`mx-0.5 h-0.5 w-4 sm:w-10 ${idx < stepIndex ? "bg-green-400" : "bg-gray-200 dark:bg-gray-600"}`} />}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-3">
              <CustomButton perm="payroll.calculate" color="purple" disabled={!run || !!busy || locked}
                onClick={() => (overrideCount > 0 ? setAskRebuild(true) : handleCalculate("keep"))}>
                <HiPlay className="mr-2 h-4 w-4" /> {rows.length ? "Recalculate" : "Calculate"}
              </CustomButton>
              {status === "Draft" && rows.length > 0 && (
                <CustomButton perm="payroll.approve" color="indigo" disabled={!!busy} onClick={() => changeStatus("Approved")}>
                  <HiCheck className="mr-2 h-4 w-4" /> Approve Payroll
                </CustomButton>
              )}
              {status === "Approved" && (
                <>
                  <CustomButton perm="payroll.approve" color="success" disabled={!!busy} onClick={() => changeStatus("Paid")}>
                    <HiLockClosed className="mr-2 h-4 w-4" /> Lock &amp; Mark as Paid
                  </CustomButton>
                  <CustomButton perm="payroll.approve" color="gray" outline disabled={!!busy} onClick={() => changeStatus("Draft")}>
                    <HiRefresh className="mr-2 h-4 w-4" /> Back to Draft
                  </CustomButton>
                </>
              )}
              {/* Hidden per the 20 Aug meeting: this sheet is the calculate view, not a
                  report, so its columns did not match Reports and caused confusion.
                  Kept in place rather than deleted — the decision may be revisited. */}
              {false && (
                <CustomButton color="gray" outline disabled={rows.length === 0} onClick={exportForEditing}>
                  <HiDownload className="mr-2 h-4 w-4" /> Export for Excel
                </CustomButton>
              )}
              <label className={`inline-flex cursor-pointer items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 ${locked || rows.length === 0 ? "pointer-events-none opacity-50" : ""}`}>
                <HiUpload className="mr-2 h-4 w-4" /> Import from Excel
                <input type="file" accept=".csv,text/csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; importEdited(f); }} />
              </label>
              {busy && <span className="text-sm text-gray-500">{busy}</span>}
              {locked && <span className="text-sm text-gray-500">{viewOnly ? "View only — your role can't change the payroll." : "This payroll is locked and cannot be changed."}</span>}
            </div>
          </div>

          {/* Pay period - defaults to the whole month, change it for a different cycle */}
          <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
            <div className="flex w-[calc(50%-0.375rem)] flex-col gap-1 sm:w-40">
              <label htmlFor="pFrom" className="text-xs font-medium text-gray-500">Pay period from</label>
              <CustomInput id="pFrom" type="date" value={pFrom} disabled={locked}
                onChange={(e) => setPFrom(e.target.value)} />
            </div>
            <div className="flex w-[calc(50%-0.375rem)] flex-col gap-1 sm:w-40">
              <label htmlFor="pTo" className="text-xs font-medium text-gray-500">to</label>
              <CustomInput id="pTo" type="date" value={pTo} disabled={locked}
                onChange={(e) => setPTo(e.target.value)} />
            </div>
            <CustomButton perm="payroll.calculate" color="gray" outline size="sm" disabled={!run || !!busy || locked} onClick={savePeriod}>
              Save Period
            </CustomButton>
            <p className="min-w-[14rem] flex-1 text-xs text-gray-400">
              Defaults to the full month. Anyone who joined or left inside the period is paid only for
              the days they were employed — the unworked days are added to No Pay Days, which you can still change.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <HiExclamation className="h-5 w-5 flex-shrink-0" /> {error}
          </div>
        )}

        {askRebuild && (
          <div className="fb-fade fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="fb-pop max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 sm:rounded-2xl">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Recalculate this payroll</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{overrideCount}</span> figure{overrideCount === 1 ? " is" : "s are"} typed
                by hand across <span className="font-semibold">{overriddenRows}</span> employee
                {overriddenRows === 1 ? "" : "s"} (marked with an amber dot).
              </p>
              {protectedOnes.length > 0 && (
                <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  <span className="font-semibold">{protectedOnes.length}</span> of them — attendance allowance,
                  salary advance and late days, Rs. {money(protectedTotal)} in total — exist only here and
                  are <span className="font-semibold">kept whichever option you pick</span>.
                </p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <button type="button"
                  onClick={() => { setAskRebuild(false); handleCalculate("keep"); }}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                  <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">Keep the typed figures</span>
                  <span className="block text-xs text-gray-500">
                    Everything else is recalculated. Use this for a normal monthly run.
                  </span>
                </button>
                <button type="button"
                  onClick={() => { setAskRebuild(false); handleCalculate("fresh"); }}
                  className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/20 dark:hover:bg-amber-900/40">
                  <span className="block text-sm font-semibold text-amber-800 dark:text-amber-300">Rebuild everything from the salary structure</span>
                  <span className="block text-xs text-amber-700 dark:text-amber-400">
                    {rebuildable.length === 0
                      ? "Nothing to discard — every typed figure here is one only you can supply, so this does the same as keeping them."
                      : `Discards ${rebuildable.length} typed figure${rebuildable.length === 1 ? "" : "s"} and takes ` +
                        "those amounts from the employee’s components instead. Use this when a component was " +
                        "added, changed or removed and the grid has not followed."}
                  </span>
                </button>
              </div>
              <div className="mt-4 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
                <CustomButton color="gray" onClick={() => setAskRebuild(false)}>Cancel</CustomButton>
              </div>
            </div>
          </div>
        )}

        {missingRows > 0 && !loading && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
            <HiExclamation className="h-5 w-5 shrink-0" />
            <span>
              Only <span className="font-semibold">{rows.length}</span> of the <span className="font-semibold">{expected}</span> staff
              employed in this period are saved in this payroll — {missingRows} {missingRows === 1 ? "is" : "are"} missing,
              so every report for the month is short. Recalculate to bring {missingRows === 1 ? "them" : "them all"} back in.
            </span>
          </div>
        )}

        {revoked > 0 && !locked && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
            <HiExclamation className="h-5 w-5 shrink-0" />
            <span>
              {revoked} increment{revoked === 1 ? " was" : "s were"} revoked on the Increment Sheet and
              {revoked === 1 ? " is" : " are"} back in Draft, so this payroll leaves {revoked === 1 ? "it" : "them"} out.
              Apply them again on the Increment Sheet, then recalculate.
            </span>
          </div>
        )}

        {stale > 0 && !locked && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            <HiExclamation className="h-5 w-5 shrink-0" />
            <span>
              {stale} change{stale === 1 ? " was" : "s were"} made to salary structures, loans or increments after
              this payroll was calculated, so {stale === 1 ? "it is" : "they are"} not in the figures below yet.
              Recalculate to bring {stale === 1 ? "it" : "them"} in
              {overrideCount > 0 && <> — you will be asked what to do with the {overrideCount} figure
              {overrideCount === 1 ? "" : "s"} typed by hand</>}.
            </span>
          </div>
        )}

        {notice && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
            {notice}
          </div>
        )}

        {/* Table - the search sits right on top of it, where the eye already is */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <div className="w-full sm:w-72">
              <CustomInput icon={HiSearch} value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search EPF number or name…" />
            </div>
            {query && (
              <span className="text-xs text-gray-400">
                {filtered.length} of {rows.length} employee{rows.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className={`table-viewport ${sheet.wrap}`}>
            <CustomTable hoverable className="text-sm">
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell className={sheet.pinHead}>
                    Employee
                  </CustomTableHeadCell>
                  <CustomTableHeadCell>Basic</CustomTableHeadCell>
                  <CustomTableHeadCell>Budgetary</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Allowances ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Increment ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600" title="Pay for an earlier month - type a minus figure to take back an overpayment">Salary Adj. ✎</CustomTableHeadCell>
                  <CustomTableHeadCell>Class Teacher</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Late Days ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">No Pay Days ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">No Pay Amt ✎</CustomTableHeadCell>
                  <CustomTableHeadCell>Gross</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Salary Advance ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Festival Adv ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Loan / Ins ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Insurance ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Other Ded. ✎</CustomTableHeadCell>
                  <CustomTableHeadCell>Stamp Duty</CustomTableHeadCell>
                  <CustomTableHeadCell>PAYE</CustomTableHeadCell>
                  <CustomTableHeadCell>EPF 8% (Ee)</CustomTableHeadCell>
                  <CustomTableHeadCell>Deductions</CustomTableHeadCell>
                  <CustomTableHeadCell>EPF 12% (Er)</CustomTableHeadCell>
                  <CustomTableHeadCell>ETF 3%</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-green-600">Net Salary</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-amber-600">Attend. Allow ✎</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-green-600">Bank Transfer</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={25} className="py-10 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : filtered.length === 0 ? (
                  <CustomTableRow>
                    <CustomTableCell colSpan={25} className="py-10 text-center text-sm text-gray-400">
                      No payroll calculated for this month yet — click <span className="font-semibold">Calculate</span> to generate it.
                    </CustomTableCell>
                  </CustomTableRow>
                ) : visible.map((r) => (
                  <CustomTableRow key={r.id} className={`${sheet.row} hover:bg-purple-50 dark:hover:bg-gray-700`}>
                    <CustomTableCell className={sheet.pinCell}>
                      <p className="whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">{displayName(r)}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        <StatusBadge color="indigo" className="text-xs">{r.emp_id}</StatusBadge>
                      </div>
                    </CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-700 dark:text-gray-300">{money(r.basicSalary)}</CustomTableCell>

                    <CustomTableCell className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {Number(r.budgetaryAllowance) ? money(r.budgetaryAllowance) : "—"}
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="otherAllowance" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="increment" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="salaryAdjustment" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} allowNegative />
                    </CustomTableCell>

                    <CustomTableCell className="whitespace-nowrap text-sm">
                      {Number(r.formTeacherAllowance) > 0 ? (
                        <>
                          <span className="text-gray-700 dark:text-gray-300">
                            {money(Number(r.formTeacherAllowance) - Number(r.formTeacherDeduction || 0))}
                          </span>
                          {Number(r.formTeacherDeduction) > 0 && (
                            <p className="text-[10px] text-red-500">−{money(r.formTeacherDeduction)} late</p>
                          )}
                        </>
                      ) : <span className="text-gray-400">—</span>}
                    </CustomTableCell>

                    <CustomTableCell>
                      {Number(r.formTeacherAllowance) > 0 ? (
                        <MonthlyInput row={r} field="lateDays" locked={locked} saving={savingId === r.id}
                          onChange={editField} onCommit={commitField} width="w-16" />
                      ) : <span className="text-sm text-gray-400">—</span>}
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="noPayDays" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} width="w-16" />
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="noPay" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>

                    <CustomTableCell className="text-sm font-semibold text-gray-800 dark:text-gray-200">{money(r.grossPay)}</CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="advanceDeduction" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="festivalAdvance" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="loanDeduction" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="insuranceDeduction" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="otherDeduction" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>

                    <CustomTableCell className="text-sm text-red-500">{Number(r.stampDuty) ? money(r.stampDuty) : "—"}</CustomTableCell>

                    <CustomTableCell className="text-sm text-red-500">{Number(r.paye) ? money(r.paye) : "—"}</CustomTableCell>
                    <CustomTableCell className="text-sm text-orange-500">{money(r.epfEmployee)}</CustomTableCell>
                    <CustomTableCell className="text-sm text-red-500">{money(r.totalDeductions)}</CustomTableCell>
                    <CustomTableCell className="text-sm text-orange-400">{money(r.epfEmployer)}</CustomTableCell>
                    <CustomTableCell className="text-sm text-orange-300">{money(r.etf)}</CustomTableCell>
                    <CustomTableCell className="whitespace-nowrap text-sm font-bold text-green-600">Rs. {money(r.netPay)}</CustomTableCell>

                    <CustomTableCell>
                      <MonthlyInput row={r} field="attendanceAllowance" locked={locked} saving={savingId === r.id}
                        onChange={editField} onCommit={commitField} />
                    </CustomTableCell>

                    {/* Only Bank-mode staff are in the bulk transfer file, so showing an
                        amount here for someone paid in cash made this column disagree with
                        the report. Show how they are paid instead. */}
                    <CustomTableCell className="whitespace-nowrap text-sm font-bold text-gray-800 dark:text-gray-100">
                      {isBankPaid(r)
                        ? `Rs. ${money(Number(r.netPay || 0) + Number(r.attendanceAllowance || 0))}`
                        : <span className="font-normal text-gray-400">{r.paymentMode || "Not by bank"}</span>}
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </div>

          {filtered.length > 25 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-sm dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-3 text-gray-500">
                <span>
                  Showing {(current - 1) * PER_PAGE + 1}–{Math.min(current * PER_PAGE, filtered.length)} of{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{filtered.length}</span> employees
                  {pageCount > 1 && <> · page {current} of {pageCount}</>}
                </span>
                <label className="flex items-center gap-1.5">
                  Show
                  <select value={perPage} onChange={(e) => setPerPage(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="all">All</option>
                  </select>
                  a page
                </label>
              </div>
              {pageCount > 1 && (
              // wraps onto a second line on a phone rather than widening the page
              <div className="flex flex-wrap items-center gap-1">
                <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  Previous
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  /* Every page number while they fit. "1 2 3 … 10" read as four pages -
                   * Nadee took October to be missing staff when all 231 were there. */
                  .filter((n) => pageCount <= 12 || n === 1 || n === pageCount || Math.abs(n - current) <= 2)
                  .map((n, i, arr) => (
                    <span key={n} className="flex items-center">
                      {i > 0 && arr[i - 1] !== n - 1 && <span className="px-1 text-gray-400">…</span>}
                      <button type="button" onClick={() => setPage(n)}
                        className={`min-w-[2rem] rounded-lg border px-2 py-1.5 ${
                          n === current
                            ? "border-purple-500 bg-purple-600 font-semibold text-white"
                            : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        }`}>
                        {n}
                      </button>
                    </span>
                  ))}
                <button type="button" disabled={current === pageCount} onClick={() => setPage(current + 1)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  Next
                </button>
              </div>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-900/50 sm:grid-cols-6">
                {[
                  { label: "Total Gross",       value: totals.gross,      color: "text-gray-700 dark:text-gray-200" },
                  { label: "Total Deductions",  value: totals.deductions, color: "text-red-600" },
                  { label: "Total EPF/ETF",     value: totals.epf,        color: "text-orange-600" },
                  { label: "Total Net Payable", value: totals.net,        color: "text-green-600" },
                  { label: "Total Attend. Allow", value: totals.attendance, color: "text-amber-600" },
                  { label: "Total Bank Transfer", value: totals.transfer, color: "text-gray-800 dark:text-gray-100" },
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
