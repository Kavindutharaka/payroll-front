import { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { HiDocumentText } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton, CustomToggle } from "../../../components/FormFields";
import { fetchEPFETFConfig, saveEPFETFConfig } from "../../../services/epfEtfConfigService";

const defaults = {
  employeeContribution: 8,
  employerContributionEPF: 12,
  employerContributionETF: 3,
  appliesTo: "All",
  enabled: true,
};

export default function EPFETFConfig() {
  const [config, setConfig] = useState(defaults);
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEPFETFConfig()
      .then((d) => { if (d && (Array.isArray(d) ? d[0] : d)) setConfig(Array.isArray(d) ? d[0] : d); })
      .catch(console.error);
  }, []);

  const handleChange = (field, val) => {
    setConfig((prev) => ({ ...prev, [field]: val }));
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await saveEPFETFConfig(config); setSaved(true); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">EPF / ETF Configuration</h1>
            <p className="mt-1 text-sm text-gray-500">
              Set contribution percentages for Employee Provident Fund and Employee Trust Fund
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
              <p className="font-semibold text-gray-800 dark:text-white">Contribution Settings</p>
            </div>
            <form className="flex flex-col gap-5 px-6 py-6" onSubmit={handleSave}>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">EPF / ETF Enabled</p>
                  <p className="text-xs text-gray-400">Toggle to enable or disable globally</p>
                </div>
                <CustomToggle
                  checked={!!config.enabled}
                  onChange={(v) => handleChange("enabled", v)}
                  color="purple"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="empContrib">Employee EPF Contribution (%)</CustomLabel>
                  <CustomInput
                    id="empContrib" type="number" min={0} max={100} step={0.5}
                    value={config.employeeContribution}
                    onChange={(e) => handleChange("employeeContribution", +e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-400">Standard rate: 8%</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="erEPF">Employer EPF Contribution (%)</CustomLabel>
                  <CustomInput
                    id="erEPF" type="number" min={0} max={100} step={0.5}
                    value={config.employerContributionEPF}
                    onChange={(e) => handleChange("employerContributionEPF", +e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-400">Standard rate: 12%</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="erETF">Employer ETF Contribution (%)</CustomLabel>
                  <CustomInput
                    id="erETF" type="number" min={0} max={100} step={0.5}
                    value={config.employerContributionETF}
                    onChange={(e) => handleChange("employerContributionETF", +e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-400">Standard rate: 3%</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="appliesTo">Applies To</CustomLabel>
                  <CustomSelect id="appliesTo" value={config.appliesTo}
                    onChange={(e) => handleChange("appliesTo", e.target.value)}>
                    <option value="All">All Employees</option>
                    <option value="Academic">Academic Only</option>
                    <option value="Non-Academic">Non-Academic Only</option>
                  </CustomSelect>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
                <CustomButton color="purple" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Configuration"}
                </CustomButton>
              </div>

              {saved && (
                <p className="text-center text-sm font-medium text-green-600 dark:text-green-400">
                  ✓ Configuration saved successfully
                </p>
              )}
            </form>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
              <p className="font-semibold text-gray-800 dark:text-white">Current Rates Summary</p>
            </div>
            <div className="flex flex-col gap-4 px-6 py-6">
              {[
                { label: "Employee EPF",  value: `${config.employeeContribution}%`,        color: "text-blue-600" },
                { label: "Employer EPF",  value: `${config.employerContributionEPF}%`,     color: "text-purple-600" },
                { label: "Employer ETF",  value: `${config.employerContributionETF}%`,     color: "text-green-600" },
                { label: "Total (Empr.)", value: `${Number(config.employerContributionEPF) + Number(config.employerContributionETF)}%`, color: "text-orange-600" },
                { label: "Applies To",    value: config.appliesTo,                         color: "text-gray-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
                  <span className={`text-lg font-bold ${color}`}>{value}</span>
                </div>
              ))}

              <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                <p className="flex items-center gap-2">
                  <HiDocumentText className="h-4 w-4 flex-shrink-0" />
                  EPF & ETF status can also be toggled per employee in Employee Management.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
