import { useState, useEffect, useMemo } from "react";
import Layout from "../../components/Layout";
import { HiUpload, HiSearch, HiExternalLink, HiTrash, HiFolderOpen, HiExclamation } from "react-icons/hi";
import { CustomButton, CustomInput, CustomSelect, CustomLabel } from "../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../components/CustomTable";
import { useCan } from "../../auth/AuthContext";
import { notify, confirmDialog } from "../../ui/feedback";
import { fetchDocuments, uploadDocument, hideDocument, openDocument, MAX_BYTES } from "../../services/documentService";

const CATEGORIES = ["Payroll sheet", "EPF / ETF", "Tax / PAYE", "Bank transfer", "Bonus", "Increment", "Other"];

const size = (b) => {
  const n = Number(b) || 0;
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
};
const monthLabel = (m) => {
  if (!m) return "—";
  const [y, mm] = String(m).split("-").map(Number);
  return new Date(y, mm - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
};
const blank = { title: "", periodMonth: "", category: "Payroll sheet", notes: "" };

/* Payroll files prepared before the system - last year's Excel sheets and so on -
 * kept here to look back at. Nothing in them is imported or calculated. */
export default function Documents() {
  const can = useCan();
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile]       = useState(null);
  const [meta, setMeta]       = useState(blank);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const [notice, setNotice]   = useState("");
  const [query, setQuery]     = useState("");
  const [cat, setCat]         = useState("all");
  const [inputKey, setInputKey] = useState(0);   // clears the file box after an upload

  const load = async () => {
    setLoading(true);
    try { const d = await fetchDocuments(); setDocs(Array.isArray(d) ? d : []); }
    catch (e) { console.error(e); setError("Could not load the file list."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (f) => (e) => setMeta((m) => ({ ...m, [f]: e.target.value }));

  const pick = (e) => {
    const f = e.target.files?.[0] || null;
    setError(""); setNotice("");
    if (f && f.size > MAX_BYTES) { setError(`That file is ${size(f.size)} — the limit is ${size(MAX_BYTES)}.`); setFile(null); return; }
    setFile(f);
    // the file name, without its extension, is a fair first title
    if (f && !meta.title) setMeta((m) => ({ ...m, title: f.name.replace(/\.[^.]+$/, "") }));
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await uploadDocument(file, meta);
      notify.success(`"${meta.title || file.name}" has been stored.`);
      setFile(null); setMeta(blank); setInputKey((k) => k + 1);
      load();
    } catch (err) {
      console.error(err);
      setError(err.userMessage || "The file could not be stored. Check the connection and try again.");
    } finally { setBusy(false); }
  };

  const remove = async (d) => {
    const ok = await confirmDialog({
      title: `Remove "${d.title}"?`,
      message: "It will no longer appear in this list or be available to open.",
      confirmLabel: "Remove", tone: "danger",
    });
    if (!ok) return;
    try { await hideDocument(d.id); notify.success(`"${d.title}" has been removed.`); load(); }
    catch (e) { console.error(e); setError("Could not remove that file."); }
  };

  const [opening, setOpening] = useState(null);
  const open = async (d) => {
    setOpening(d.id);
    try { await openDocument(d); }
    catch (e) { notify.error(e.userMessage || "Could not open that file."); }
    finally { setOpening(null); }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs
      .filter((d) => cat === "all" || d.category === cat)
      .filter((d) => !q || `${d.title} ${d.fileName} ${d.notes || ""} ${monthLabel(d.periodMonth)}`.toLowerCase().includes(q));
  }, [docs, query, cat]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Payroll Files</h1>
          <p className="mt-1 text-sm text-gray-500">
            Earlier Excel sheets and other payroll files, kept to look back at. They are stored as they are — nothing in them is imported.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <HiExclamation className="h-5 w-5 flex-shrink-0" /> {error}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
            {notice}
          </div>
        )}

        {can("documents.upload") && <form onSubmit={upload}
          className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1.5 md:col-span-2 xl:col-span-4">
            <CustomLabel htmlFor="docFile">File</CustomLabel>
            <input key={inputKey} id="docFile" type="file" onChange={pick}
              accept=".xlsx,.xls,.xlsm,.csv,.pdf,.doc,.docx"
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-purple-700 hover:file:bg-purple-100 dark:text-gray-300" />
          </div>
          <div className="flex flex-col gap-1.5 xl:col-span-2">
            <CustomLabel htmlFor="docTitle">Title</CustomLabel>
            <CustomInput id="docTitle" value={meta.title} onChange={set("title")} placeholder="e.g. Payroll sheet September 2025" />
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="docMonth">Month it covers</CustomLabel>
            <input id="docMonth" type="month" value={meta.periodMonth} onChange={set("periodMonth")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="docCat">Kind</CustomLabel>
            <CustomSelect id="docCat" value={meta.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </CustomSelect>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2 xl:col-span-3">
            <CustomLabel htmlFor="docNotes">Notes <span className="font-normal text-gray-400">(optional)</span></CustomLabel>
            <CustomInput id="docNotes" value={meta.notes} onChange={set("notes")} placeholder="Anything worth knowing about this file" />
          </div>
          <div className="flex items-end">
            <CustomButton color="purple" type="submit" disabled={!file || busy} className="w-full">
              <HiUpload className="mr-2 h-4 w-4" /> {busy ? "Storing…" : "Store File"}
            </CustomButton>
          </div>
        </form>}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <div className="w-72">
              <CustomInput icon={HiSearch} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, file or month…" />
            </div>
            <div className="w-52">
              <CustomSelect value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="all">All kinds</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </CustomSelect>
            </div>
            <span className="text-xs text-gray-400">{shown.length} of {docs.length}</span>
          </div>
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>Month</CustomTableHeadCell>
                  <CustomTableHeadCell>Title</CustomTableHeadCell>
                  <CustomTableHeadCell>Kind</CustomTableHeadCell>
                  <CustomTableHeadCell>File</CustomTableHeadCell>
                  <CustomTableHeadCell>Stored</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={6} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : shown.length === 0 ? (
                  <CustomTableRow><CustomTableCell colSpan={6} className="py-10 text-center text-sm text-gray-400">
                    <HiFolderOpen className="mx-auto mb-2 h-8 w-8" />
                    {docs.length ? "No file matches this search." : "No files stored yet — choose a file above and click Store File."}
                  </CustomTableCell></CustomTableRow>
                ) : shown.map((d) => (
                  <CustomTableRow key={d.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{monthLabel(d.periodMonth)}</CustomTableCell>
                    <CustomTableCell className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {d.title}
                      {d.notes && <p className="text-xs font-normal text-gray-400">{d.notes}</p>}
                    </CustomTableCell>
                    <CustomTableCell className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{d.category || "—"}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">
                      {d.fileName}<span className="ml-1 text-xs text-gray-400">({size(d.sizeBytes)})</span>
                    </CustomTableCell>
                    <CustomTableCell className="whitespace-nowrap text-xs text-gray-500">{d.uploadedAt}</CustomTableCell>
                    <CustomTableCell>
                      <div className="flex justify-center gap-2">
                        {/* Excel files open in Excel; a PDF opens in the browser */}
                        <button type="button" onClick={() => open(d)} disabled={opening === d.id}
                          title="Open / download"
                          className="inline-flex items-center rounded-full border border-purple-400 px-2.5 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-60 dark:text-purple-300">
                          <HiExternalLink className="mr-1 h-3.5 w-3.5" /> {opening === d.id ? "Opening…" : "Open"}
                        </button>
                        <CustomButton perm="documents.remove" size="xs" color="failure" outline pill title="Remove from the list" onClick={() => remove(d)}>
                          <HiTrash className="h-3.5 w-3.5" />
                        </CustomButton>
                      </div>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>
    </Layout>
  );
}
