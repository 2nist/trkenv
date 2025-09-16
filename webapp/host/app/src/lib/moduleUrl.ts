export function moduleToPublicUrl(m:{id?:string, path?:string, ui?:string}){
  // If manifest provides id, assume frontend hosts module UI under /experiments/<id>/ui/
  const id = m?.id
  const ui = m?.ui || 'ui/index.html'
  if (id) return `/experiments/${id}/ui/${ui.replace(/^\/+/, '')}`
  // Fallback: if path looks like modules/.../name and a UI path is present, try to compute a relative mapping
  return '#'
}
