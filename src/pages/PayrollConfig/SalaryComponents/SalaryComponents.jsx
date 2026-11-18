import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlus, HiSearch } from "react-icons/hi";
import ComponentForm from "./ComponentForm";
import { CustomInput, CustomButton } from "../../../components/FormFields";
import DataTable, { RowActions } from "../../../ui/DataTable";
import { fetchSalaryComponents, createSalaryComponent, updateSalaryComponent, archiveSalaryComponent } from "../../../services/salaryComponentService";
import { notify, confirmDialog } from "../../../ui/feedback";

const typeColor = { Allowance: "success", Deduction: "failure", "Employer Contribution": "indigo" };
const boolBadge = (v) => <StatusBadge color={v ? "success" : "gray"} className="w-fit text-xs">{v ? "Yes" : "No"}</StatusBadge>;

export default function SalaryComponents() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editData, setEditData]     = useState(null);
  const [search, setSearch]         = useState("");

  const load = async () => {
    setLoading(true);
    try { const data = await fetchSalaryComponents(); setComponents(Array.isArray(data) ? data : []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editData) await updateSalaryComponent(editData.id, form);
      else          await createSalaryComponent(form);
      setShowForm(false); setEditData(null); load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDialog({ title: "Archive this salary component?", message: "It can no longer be assigned to employees. Amounts already assigned are not changed.", confirmLabel: "Archive", tone: "danger" }))) return;
    try { await archiveSalaryComponent(id); notify.success("Salary component archived."); load(); } catch (err) { console.error(err); notify.error(err.userMessage || "That didn't work. Please try again."); }
  };

  const filtered = components.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: "name", label: "Component Name", always: true, card: "title",
      render: (c) => <span className="font-medium text-gray-800 dark:text-gray-100">{c.name}</span> },
    { key: "type", label: "Type", card: "badge",
      render: (c) => <StatusBadge color={typeColor[c.type] ?? "gray"} className="w-fit text-xs">{c.type}</StatusBadge> },
    { key: "calc", label: "Calculation", card: "subtitle", render: (c) => <span className="text-xs text-gray-500">{c.calcType}</span> },
    { key: "value", label: "Default Value", align: "right", card: true,
      render: (c) => (c.calcType === "Fixed Amount" ? `Rs. ${Number(c.defaultValue).toLocaleString()}`
        : c.calcType === "Formula Based" ? "Formula" : `${c.defaultValue}%`) },
    { key: "taxable", label: "Taxable", render: (c) => boolBadge(c.taxable) },
    { key: "epf", label: "EPF", render: (c) => boolBadge(c.epfApplicable) },
    { key: "etf", label: "ETF", render: (c) => boolBadge(c.etfApplicable) },
    { key: "mandatory", label: "Mandatory", render: (c) => boolBadge(c.mandatory) },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Salary Components</h1>
            <p className="mt-1 text-sm text-gray-500">Define dynamic allowances and deductions — no coding needed</p>
          </div>
          <CustomButton perm="payrollConfig.edit" color="purple" onClick={() => { setEditData(null); setShowForm(true); }}>
            <HiPlus className="mr-2 h-4 w-4" /> Create Component
          </CustomButton>
        </div>

        <DataTable
          id="salaryComponents"
          columns={columns}
          rows={filtered}
          loading={loading}
          empty={components.length ? "No component matches this search." : "No salary components yet."}
          toolbar={(
            <CustomInput icon={HiSearch} placeholder="Search components..." sizing="sm" className="w-full sm:w-64"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
          actions={(c, { inPanel } = {}) => (
            <RowActions inPanel={inPanel} editPerm="payrollConfig.edit" deletePerm="payrollConfig.delete"
              onEdit={() => { setEditData(c); setShowForm(true); }} onDelete={() => handleDelete(c.id)} />
          )}
          detail={{ title: (c) => c.name, subtitle: (c) => c.type }}
          footer={<span>{filtered.length} component{filtered.length !== 1 ? "s" : ""}</span>}
        />
      </div>

      {showForm && (
        <ComponentForm
          closeForm={() => { setShowForm(false); setEditData(null); }}
          initialData={editData}
          onSave={handleSave}
        />
      )}
    </Layout>
  );
}
