// Bounded changes to an existing follow-up. Storage/authentication stay in worker.mjs.
import { HttpError } from './auth.mjs';
const fail = (status, message) => { throw new HttpError(status, message); };
const own = (obj, key) => Object.hasOwn(obj, key);
const owners = ['Registrar', 'Treasurer', 'Preceptor'];
const states = ['open', 'progress', 'waiting', 'done'];
const keys = ['title', 'owner', 'priority', 'due', 'state', 'reference', 'reason'];
const nonblank = (value, max=3000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export function canManageAction(role, owner) {
  return role === 'admin' || (role === 'registrar' && owner !== 'Treasurer') ||
    (role === 'treasurer' && owner === 'Treasurer');
}
export function updateAction(current, input, role) {
  if (!canManageAction(role, current.owner)) fail(403, 'This account cannot update this action.');
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(k => !keys.includes(k))) fail(422, 'Unsupported action fields.');
  const next = { ...current };
  for (const k of keys.filter(k => k !== 'reason')) if (own(input, k)) next[k] = input[k];
  if (!nonblank(next.title) || !owners.includes(next.owner) || !states.includes(next.state) ||
      !['normal', 'high'].includes(next.priority) || typeof next.reference !== 'string' ||
      next.reference.length > 3000) fail(422, 'Check the action title, owner, status, priority and note.');
  if (role === 'treasurer' && next.owner !== 'Treasurer') fail(403, 'Only the Registrar or administrator may reassign this follow-up.');
  if (typeof next.due !== 'string') fail(422, 'Use a valid due date or leave it blank.');
  if (next.due) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(next.due) && new Date(next.due + 'T12:00:00Z');
    if (!date || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== next.due) fail(422, 'Use a valid due date or leave it blank.');
  }
  next.title = next.title.trim(); next.reference = next.reference.trim();
  if (own(input, 'reason') && !nonblank(input.reason)) fail(422, 'Add a short reason for this change.');
  if (next.state === 'done' && !next.reference) fail(422, 'Add what was completed and its reference before ticking this off.');
  if (current.state !== 'done' && next.state === 'done' && !nonblank(input.reference)) fail(422, 'Add a completion note for this action.');
  if (current.state === 'done' && next.state !== 'done' && !nonblank(input.reason) && !nonblank(input.reference)) fail(422, 'Add a reason for reopening this action.');
  const changed = keys.filter(k => k !== 'reason' && next[k] !== current[k]);
  if (!changed.length) fail(422, 'No action changes to save.');
  if (changed.some(k => ['title', 'owner', 'priority', 'due'].includes(k)) && !nonblank(input.reason)) fail(422, 'Add a short reason for editing this follow-up.');
  const transition = next.state === current.state ? '' : ` ${current.state} → ${next.state};`;
  return {
    action: next,
    summary: `Follow-up ${current.id}:${transition} ${changed.join(', ')}`,
    reference: (input.reason || next.reference || 'Progress update').trim()
  };
}
