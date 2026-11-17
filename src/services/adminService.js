import { http } from './api';

/* Users, roles and the activity log - backend/PayrollApi/Endpoints/AdminEndpoints.cs.
 * Only people whose role includes "Users & roles - Manage" get past the server. */

const data = (p) => p.then((r) => r.data);

export const fetchPermissionCatalog = () => data(http.get('/api/admin/catalog'));

export const fetchUsers      = () => data(http.get('/api/admin/users'));
export const createUser      = (u) => data(http.post('/api/admin/users', u));
export const updateUser      = (id, u) => data(http.put(`/api/admin/users/${id}`, u));
export const resetPassword   = (id) => data(http.post(`/api/admin/users/${id}/reset-password`));
export const removeUser      = (id) => data(http.delete(`/api/admin/users/${id}`));

export const fetchRoles      = () => data(http.get('/api/admin/roles'));
export const createRole      = (r) => data(http.post('/api/admin/roles', r));
export const updateRole      = (id, r) => data(http.put(`/api/admin/roles/${id}`, r));
export const removeRole      = (id) => data(http.delete(`/api/admin/roles/${id}`));

export const fetchActivity   = (take = 300) => data(http.get('/api/admin/activity', { params: { take } }));

export const DEFAULT_PASSWORD = '123456';
