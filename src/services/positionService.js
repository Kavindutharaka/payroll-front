import { execSQL, esc } from './api';

const TABLE = 'dbo.payroll_position';
const SP    = 'dbo.payroll_position_sp';

export const fetchPositions = () =>
  execSQL(`SELECT * FROM ${TABLE} WHERE status != 'Deleted' ORDER BY id ASC`);

export const createPosition = (d) =>
  execSQL(`EXEC ${SP} @action='INSERT',@name=${esc(d.name)},@description=${esc(d.description)}`);

export const updatePosition = (id, d) =>
  execSQL(`EXEC ${SP} @action='UPDATE',@id=${id},@name=${esc(d.name)},@description=${esc(d.description)}`);

export const deletePosition = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
