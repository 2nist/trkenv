// lab-menu.js (no CSS changes; uses existing site styles)
// Call renderLabMenu(sidebarElement) to populate from /api/registry
export async function renderLabMenu(el){
  try{
    const r = await fetch('/api/registry');
    if(!r.ok) throw new Error('registry failed');
    const reg = await r.json();
    const mk = (title, items)=>{
      const wrap = document.createElement('div');
      const h = document.createElement('h3'); h.textContent = title; wrap.appendChild(h);
      const ul = document.createElement('ul'); ul.style.listStyle='none'; ul.style.padding='0';
      items.forEach(m=>{
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = m.name || m.id;
        // href points to the module UI if a 'ui/index.html' exists, otherwise '#'
        if (m.path) {
          // m.path is the manifest path's parent directory; map to experiments style URL
          a.href = '/experiments/' + (m.id || m.name) + '/ui/index.html';
        } else {
          a.href = '#';
        }
        a.onclick = (e) => { e.preventDefault(); const iframe = document.querySelector('iframe#panel'); if(iframe){ iframe.src = a.href; } };
        li.appendChild(a);
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
      el.appendChild(wrap);
    };
    el.innerHTML='';
    mk('Start', [{id:'home', name:'Home'}]);
    mk('Panels', reg.panels || []);
    mk('Tools', reg.tools || []);
    mk('Jobs', reg.jobs || []);
    mk('Devices', reg.devices || []);
    mk('Datasets', reg.datasets || []);
    mk('Exports', reg.exporters || []);
  }catch(e){ el.textContent = 'Menu error: ' + e }
}
