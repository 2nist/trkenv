export function moduleToPublicUrl(m: any): string | null {
  if (!m) return null;
  // Accept shapes like { id, uiPath } or { path }
  if (typeof m === 'string') return m;
  if (m.uiPath) return `/experiments/${m.id || 'unknown'}/ui/${m.uiPath.replace(/^\/+/, '')}`;
  if (m.path) return String(m.path);
  if (m.id) return `/experiments/${m.id}`;
  return null;
}