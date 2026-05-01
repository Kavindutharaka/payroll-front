import { execSQL, esc } from './api';

const TABLE = 'dbo.payroll_level';
const SP    = 'dbo.payroll_level_sp';

export const fetchLevels = () =>
  execSQL(`SELECT * FROM ${TABLE} WHERE status != 'Deleted' ORDER BY id ASC`);

export const createLevel = (d) =>
  execSQL(`EXEC ${SP} @action='INSERT',@name=${esc(d.name)},@description=${esc(d.description)}`);

export const updateLevel = (id, d) =>
  execSQL(`EXEC ${SP} @action='UPDATE',@id=${id},@name=${esc(d.name)},@description=${esc(d.description)}`);

export const deleteLevel = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
