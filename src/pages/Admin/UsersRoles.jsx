import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import {
  HiPlus, HiSearch, HiKey, HiPencil, HiShieldCheck, HiLockClosed, HiRefresh, HiTrash, HiUserGroup, HiX,
} from "react-icons/hi";
import { useAuth } from "../../auth/AuthContext";
import { notify, confirmDialog } from "../../ui/feedback";
import {
  fetchUsers, createUser, updateUser, resetPassword, removeUser,
  fetchRoles, createRole, updateRole, removeRole, fetchPermissionCatalog, fetchActivity, DEFAULT_PASSWORD,
} from "../../services/adminService";

/* ------------------------------------------------------------------ helpers */

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

const when = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  const exact = d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  let rel;
  if (mins < 1) rel = "Just now";
  else if (mins < 60) rel = `${mins} min ago`;
  else if (mins < 60 * 24) rel = `${Math.round(mins / 60)} h ago`;
  else if (mins < 60 * 24 * 7) rel = `${Math.round(mins / 1440)} days ago`;
  else rel = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return { rel, exact };
};

const errorText = (e, fallback) => e?.userMessage || fallback;

const btn = {
  primary: "inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:cursor-not-allowed disabled:opacity-60",
  secondary: "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
  ghost: "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white",
  danger: "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40",
};
const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

function Badge({ tone = "gray", children, title }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300",
    red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300",
    navy: "bg-indigo-50 text-indigo-800 ring-indigo-600/20 dark:bg-indigo-950/50 dark:text-indigo-300",
  };
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children, footer, wide }) {
  useEffect(() => {
    // a confirmation on top of this dialog gets the Escape, not the dialog
    const esc = (e) => { if (e.key === "Escape" && !document.querySelector('[class*="z-[90]"], [class*="z-[95]"]')) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="fb-fade absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
        className={`fb-pop relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-between gap-2 sm:rounded-b-2xl border-t border-gray-100 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800/60">{footer}</div>}
      </div>
    </div>
  );
}

function FieldRow({ label, htmlFor, help, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
      {children}
      {help && <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{help}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="px-6 py-14 text-center">
      <Icon className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
      <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      {text && <p className="mt-1 text-sm text-gray-500">{text}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ page */

const TABS = [
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles & access" },
  { key: "activity", label: "Activity" },
];

export default function UsersRoles() {
  const [tab, setTab] = useState("users");
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);

  const loadRoles = useCallback(async () => {
    try { setRoles(await fetchRoles()); }
    catch (e) { notify.error(errorText(e, "Could not load the roles.")); }
  }, []);

  useEffect(() => {
    loadRoles();
    fetchPermissionCatalog().then(setCatalog).catch((e) => notify.error(errorText(e, "Could not load the permission list.")));
  }, [loadRoles]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Users &amp; roles</h1>
          <p className="mt-1 text-sm text-gray-500">Who can sign in, and what each role can see and do.</p>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-6" role="tablist">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => setTab(t.key)}
                className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${tab === t.key
                  ? "border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {tab === "users" && <UsersTab roles={roles} onRolesStale={loadRoles} />}
        {tab === "roles" && <RolesTab roles={roles} catalog={catalog} reload={loadRoles} />}
        {tab === "activity" && <ActivityTab />}
      </div>
    </Layout>
  );
}

/* ------------------------------------------------------------------ users */

function UsersTab({ roles, onRolesStale }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // null | {} (new) | user

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await fetchUsers()); }
    catch (e) { notify.error(errorText(e, "Could not load the users.")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => !q || `${u.displayName} ${u.username} ${u.role}`.toLowerCase().includes(q));
  }, [users, query]);

  const reset = async (u) => {
    const ok = await confirmDialog({
      title: `Reset ${u.displayName}'s password?`,
      message: (
        <>
          Their password goes back to the default, <span className="font-mono font-semibold text-gray-900 dark:text-white">{DEFAULT_PASSWORD}</span>.
          They'll be signed out everywhere and asked to choose a new password the next time they sign in.
          {u.isLocked ? " This also unlocks the account." : ""}
        </>
      ),
      confirmLabel: "Reset password",
    });
    if (!ok) return;
    try {
      await resetPassword(u.id);
      notify.success(`Tell ${u.displayName} to sign in as "${u.username}" with ${DEFAULT_PASSWORD}.`, { title: "Password reset" });
      load();
    } catch (e) { notify.error(errorText(e, "Could not reset the password.")); }
  };

  const status = (u) => {
    if (!u.isActive) return <Badge tone="gray">Disabled</Badge>;
    if (u.isLocked) return <Badge tone="red" title="Too many wrong passwords. Reset the password to unlock now, or wait 15 minutes."><HiLockClosed className="h-3 w-3" /> Locked</Badge>;
    if (u.mustChangePassword) return <Badge tone="amber" title={`Signs in with ${DEFAULT_PASSWORD} and must choose a password`}>Awaiting first sign-in</Badge>;
    return <Badge tone="green">Active</Badge>;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700">
        <div className="relative w-full max-w-xs">
          <HiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, username or role"
            className={`${inputCls} pl-9`} aria-label="Search users" />
        </div>
        <button type="button" className={btn.primary} onClick={() => setEditing({})}>
          <HiPlus className="h-4 w-4" /> Add user
        </button>
      </div>

      {loading && users.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500">Loading users…</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={HiUserGroup} title={query ? "No one matches that search" : "No users yet"} />
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Person</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last sign-in</th>
                <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {shown.map((u) => {
                const seen = when(u.lastLoginAt);
                const self = u.id === me?.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${u.isActive ? "bg-[#29166F] text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"}`}>
                          {initials(u.displayName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900 dark:text-white">
                            {u.displayName}{self && <span className="ml-1.5 text-xs font-normal text-gray-400">(you)</span>}
                          </p>
                          <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                        {u.isAdmin && <HiShieldCheck className="h-4 w-4 text-[#29166F] dark:text-indigo-300" title="Full access" />}
                        {u.role}
                      </span>
                      {u.isDeveloper && <span className="ml-2"><Badge tone="navy">Developer</Badge></span>}
                    </td>
                    <td className="px-5 py-3">{status(u)}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {seen ? <span title={seen.exact}>{seen.rel}</span> : <span className="text-gray-400">Never</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" className={btn.ghost} onClick={() => setEditing(u)}>
                          <HiPencil className="h-4 w-4" /> Edit
                        </button>
                        {!self && (
                          <button type="button" className={btn.ghost} onClick={() => reset(u)}>
                            <HiKey className="h-4 w-4" /> Reset password
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <UserModal user={editing.id ? editing : null} roles={roles} self={editing.id === me?.id}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); onRolesStale(); }} />
      )}
    </div>
  );
}

function UserModal({ user, roles, self, onClose, onSaved }) {
  const isNew = !user;
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [roleId, setRoleId] = useState(user?.roleId || "");
  const [isActive, setIsActive] = useState(user ? !!user.isActive : true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const role = roles.find((r) => String(r.id) === String(roleId));

  const save = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return setError("Enter the person's name.");
    if (isNew && !/^[A-Za-z0-9._-]{3,40}$/.test(username.trim())) return setError("Usernames are 3 to 40 characters: letters, numbers, dot, dash or underscore.");
    if (!roleId) return setError("Choose a role.");
    setBusy(true); setError("");
    try {
      if (isNew) {
        await createUser({ username: username.trim(), displayName: displayName.trim(), roleId: Number(roleId) });
        notify.success(`${displayName.trim()} can sign in as "${username.trim()}" with ${DEFAULT_PASSWORD}, then choose a password.`, { title: "User added" });
      } else {
        await updateUser(user.id, { displayName: displayName.trim(), roleId: Number(roleId), isActive });
        notify.success(`${displayName.trim()}'s details have been saved.`);
      }
      onSaved();
    } catch (err) {
      setError(errorText(err, "Could not save."));
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: `Remove ${user.displayName}?`,
      message: "They won't be able to sign in any more. Their past activity stays in the log. To let them back in later, add them again.",
      confirmLabel: "Remove user",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await removeUser(user.id);
      notify.success(`${user.displayName} has been removed.`);
      onSaved();
    } catch (err) { setError(errorText(err, "Could not remove this user.")); }
  };

  return (
    <Modal title={isNew ? "Add user" : `Edit ${user.displayName}`}
      subtitle={isNew ? `They'll sign in with ${DEFAULT_PASSWORD} the first time and choose their own password.` : user.username}
      onClose={onClose}
      footer={
        <>
          <div>{!isNew && !self && <button type="button" className={btn.danger} onClick={remove}><HiTrash className="h-4 w-4" /> Remove user</button>}</div>
          <div className="flex gap-2">
            <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
            <button type="submit" form="user-form" className={btn.primary} disabled={busy}>{busy ? "Saving…" : isNew ? "Add user" : "Save"}</button>
          </div>
        </>
      }>
      <form id="user-form" onSubmit={save} className="flex flex-col gap-4" noValidate>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        <FieldRow label="Name" htmlFor="u-name">
          <input id="u-name" className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus placeholder="Full name" />
        </FieldRow>
        <FieldRow label="Username" htmlFor="u-username" help={isNew ? "What they type to sign in. It can't be changed later." : undefined}>
          <input id="u-username" className={`${inputCls} font-mono`} value={username} onChange={(e) => setUsername(e.target.value)}
            disabled={!isNew} autoCapitalize="none" spellCheck={false} placeholder="e.g. accounts2" />
        </FieldRow>
        <FieldRow label="Role" htmlFor="u-role" help={self ? "You can't change your own role." : role?.description}>
          <select id="u-role" className={inputCls} value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={self}>
            <option value="">Choose a role…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </FieldRow>
        {!isNew && !self && (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
            <span>
              <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">Can sign in</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Untick to block this account straight away without removing it.</span>
            </span>
          </label>
        )}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ roles */

function RolesTab({ roles, catalog, reload }) {
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);     // { id?, name, description, permissions: Set }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = roles.find((r) => r.id === selectedId) || null;
  const locked = !!selected?.isSystem;

  const open = (r) => {
    setError("");
    setSelectedId(r?.id ?? null);
    setDraft(r ? { id: r.id, name: r.name, description: r.description || "", permissions: new Set(r.permissions) }
               : { name: "", description: "", permissions: new Set() });
  };

  useEffect(() => {
    if (!draft && roles.length) open(roles.find((r) => !r.isSystem) || roles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  const original = selected ? JSON.stringify([selected.name, selected.description || "", [...selected.permissions].sort()]) : "";
  const dirty = draft && !locked && JSON.stringify([draft.name, draft.description, [...draft.permissions].sort()]) !== original;

  const switchTo = async (r) => {
    if (dirty && !(await confirmDialog({ title: "Discard your changes?", message: `The changes to "${draft.name || "the new role"}" haven't been saved.`, confirmLabel: "Discard", tone: "danger" }))) return;
    open(r);
  };

  const toggle = (module, action, on) => setDraft((d) => {
    const p = new Set(d.permissions);
    const key = `${module.key}.${action}`;
    const hasView = module.actions.some((a) => a.key === "view");
    if (on) { p.add(key); if (hasView) p.add(`${module.key}.view`); }
    else if (action === "view") module.actions.forEach((a) => p.delete(`${module.key}.${a.key}`)); // no view, nothing else
    else p.delete(key);
    return { ...d, permissions: p };
  });

  const setModule = (module, mode) => setDraft((d) => {
    const p = new Set(d.permissions);
    module.actions.forEach((a) => p.delete(`${module.key}.${a.key}`));
    if (mode === "all") module.actions.forEach((a) => p.add(`${module.key}.${a.key}`));
    if (mode === "view") p.add(`${module.key}.view`);
    return { ...d, permissions: p };
  });

  const save = async () => {
    if (!draft.name.trim()) { setError("Give the role a name."); return; }
    setSaving(true); setError("");
    const body = { name: draft.name.trim(), description: draft.description.trim(), permissions: [...draft.permissions] };
    try {
      if (draft.id) {
        await updateRole(draft.id, body);
        notify.success(`"${body.name}" saved. People with this role see the change straight away.`);
      } else {
        const { id } = await createRole(body);
        setSelectedId(id);
        setDraft((d) => ({ ...d, id }));
        notify.success(`"${body.name}" created. Give it to people on the Users tab.`);
      }
      await reload();
    } catch (e) { setError(errorText(e, "Could not save the role.")); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!(await confirmDialog({ title: `Delete the role "${selected.name}"?`, message: "This can't be undone. Roles that people still have can't be deleted.", confirmLabel: "Delete role", tone: "danger" }))) return;
    try {
      await removeRole(selected.id);
      notify.success(`"${selected.name}" deleted.`);
      setDraft(null); setSelectedId(null);
      await reload();
    } catch (e) { setError(errorText(e, "Could not delete the role.")); }
  };

  const groups = useMemo(() => {
    const g = [];
    catalog.forEach((m) => {
      let grp = g.find((x) => x.name === m.group);
      if (!grp) g.push((grp = { name: m.group, modules: [] }));
      grp.modules.push(m);
    });
    return g;
  }, [catalog]);

  const has = (m, a) => locked || draft?.permissions.has(`${m.key}.${a}`);
  const count = draft ? (locked ? catalog.reduce((n, m) => n + m.actions.length, 0) : draft.permissions.size) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_1fr]">
      {/* role list */}
      <div className="h-fit rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Roles</p>
          <button type="button" className={btn.ghost} onClick={() => switchTo(null)}><HiPlus className="h-4 w-4" /> New</button>
        </div>
        <ul className="p-2">
          {roles.map((r) => {
            const active = draft && draft.id === r.id;
            return (
              <li key={r.id}>
                <button type="button" onClick={() => switchTo(r)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${active ? "bg-purple-50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200" : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50"}`}>
                  <span className="flex min-w-0 items-center gap-1.5">
                    {r.isAdmin && <HiShieldCheck className="h-4 w-4 flex-shrink-0 text-[#29166F] dark:text-indigo-300" />}
                    <span className="truncate font-medium">{r.name}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs tabular-nums text-gray-400" title={`${r.userCount} user(s)`}>{r.userCount}</span>
                </button>
              </li>
            );
          })}
          {draft && !draft.id && (
            <li><span className="flex w-full rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">{draft.name || "New role"}</span></li>
          )}
        </ul>
      </div>

      {/* editor */}
      {draft ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-4 border-b border-gray-100 p-5 dark:border-gray-700 md:grid-cols-[minmax(0,16rem)_1fr]">
            <FieldRow label="Role name" htmlFor="r-name">
              <input id="r-name" className={inputCls} value={draft.name} disabled={locked}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. HR assistant" />
            </FieldRow>
            <FieldRow label="Description" htmlFor="r-desc">
              <input id="r-desc" className={inputCls} value={draft.description} disabled={locked}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this role is for" />
            </FieldRow>
          </div>

          {locked && (
            <div className="flex items-start gap-2 border-b border-gray-100 bg-indigo-50/60 px-5 py-3 text-sm text-indigo-900 dark:border-gray-700 dark:bg-indigo-950/30 dark:text-indigo-200">
              <HiShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
              This built-in role always has full access to everything, including parts added to the system later. It can't be changed or deleted.
            </div>
          )}

          {error && <div role="alert" className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {groups.map((g) => (
              <section key={g.name} className="px-5 py-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{g.name}</h3>
                <div className="flex flex-col">
                  {g.modules.map((m) => {
                    const any = m.actions.some((a) => has(m, a.key));
                    return (
                      <div key={m.key} className="grid grid-cols-1 items-center gap-2 py-2 sm:grid-cols-[13rem_1fr]">
                        <div className="flex items-center justify-between gap-2 sm:block">
                          <p className={`text-sm font-medium ${any ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>{m.label}</p>
                          {!locked && (
                            <div className="flex gap-2 text-xs sm:mt-0.5">
                              <button type="button" className="text-purple-700 hover:underline dark:text-purple-300" onClick={() => setModule(m, "all")}>All</button>
                              {any && <button type="button" className="text-gray-500 hover:underline" onClick={() => setModule(m, "none")}>None</button>}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {m.actions.map((a) => {
                            const on = has(m, a.key);
                            return (
                              <label key={a.key} title={a.hint}
                                className={`inline-flex select-none items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${locked ? "cursor-default" : "cursor-pointer"} ${on
                                  ? "border-purple-300 bg-purple-50 text-purple-900 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-100"
                                  : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300"}`}>
                                <input type="checkbox" checked={on} disabled={locked}
                                  onChange={(e) => toggle(m, a.key, e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-70" />
                                {a.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {!locked && (
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-gray-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {count} permission{count === 1 ? "" : "s"}{dirty && <span className="ml-2 font-medium text-amber-700 dark:text-amber-400">· Unsaved changes</span>}
              </p>
              <div className="flex gap-2">
                {draft.id && <button type="button" className={btn.danger} onClick={remove}><HiTrash className="h-4 w-4" /> Delete role</button>}
                {dirty && draft.id && <button type="button" className={btn.secondary} onClick={() => open(selected)}>Undo changes</button>}
                <button type="button" className={btn.primary} onClick={save} disabled={saving || (!dirty && !!draft.id)}>
                  {saving ? "Saving…" : draft.id ? "Save role" : "Create role"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <EmptyState icon={HiShieldCheck} title="Choose a role" text="Pick a role on the left to see what it can do, or create a new one." />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ activity */

const ACTIONS = {
  LOGIN: ["Signed in", "gray"], LOGOUT: ["Signed out", "gray"], LOGIN_FAILED: ["Sign-in failed", "amber"],
  ACCOUNT_LOCKED: ["Account locked", "red"], PASSWORD_CHANGED: ["Changed password", "gray"],
  PASSWORD_RESET: ["Reset a password", "navy"], USER_CREATED: ["Added a user", "navy"], USER_UPDATED: ["Changed a user", "navy"],
  USER_REMOVED: ["Removed a user", "navy"], ROLE_CREATED: ["Created a role", "navy"], ROLE_UPDATED: ["Changed a role", "navy"],
  ROLE_REMOVED: ["Deleted a role", "navy"], CHANGE: ["Changed payroll data", "green"], FILE_UPLOADED: ["Uploaded a file", "green"],
  DENIED: ["Blocked by role", "red"], REFUSED: ["Request refused", "red"], SETUP: ["System set up", "gray"],
};
const FILTERS = [
  { key: "all", label: "Everything" },
  { key: "signin", label: "Sign-ins", match: (a) => ["LOGIN", "LOGOUT", "LOGIN_FAILED", "ACCOUNT_LOCKED", "PASSWORD_CHANGED"].includes(a) },
  { key: "data", label: "Payroll changes", match: (a) => ["CHANGE", "FILE_UPLOADED"].includes(a) },
  { key: "admin", label: "Users & roles", match: (a) => a.startsWith("USER_") || a.startsWith("ROLE_") || a === "PASSWORD_RESET" },
  { key: "blocked", label: "Blocked", match: (a) => ["DENIED", "REFUSED", "LOGIN_FAILED", "ACCOUNT_LOCKED"].includes(a) },
];

function ActivityTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchActivity(500)); }
    catch (e) { notify.error(errorText(e, "Could not load the activity.")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const f = FILTERS.find((x) => x.key === filter);
  const shown = rows.filter((r) => !f.match || f.match(r.action));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((x) => (
            <button key={x.key} type="button" onClick={() => setFilter(x.key)}
              className={`rounded-full px-3 py-1 text-sm ${filter === x.key ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"}`}>
              {x.label}
            </button>
          ))}
        </div>
        <button type="button" className={btn.secondary} onClick={load} disabled={loading}>
          <HiRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={HiRefresh} title={loading ? "Loading…" : "Nothing here yet"} />
      ) : (
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-gray-100 bg-white text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              <tr><th className="px-5 py-3">When</th><th className="px-5 py-3">Who</th><th className="px-5 py-3">What</th><th className="px-5 py-3">Details</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {shown.map((r) => {
                const [label, tone] = ACTIONS[r.action] || [r.action, "gray"];
                const t = when(r.at);
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-5 py-2.5 text-gray-600 dark:text-gray-300" title={t?.exact}>{t?.exact}</td>
                    <td className="whitespace-nowrap px-5 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-200">{r.username || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-2.5"><Badge tone={tone}>{label}</Badge></td>
                    <td className="px-5 py-2.5 text-gray-600 dark:text-gray-300">{r.detail || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
