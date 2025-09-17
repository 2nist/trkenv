"use client";
import React, { useEffect, useState } from 'react';
import styles from './LabMenu.module.css';

export type ModuleEntry = {
  id: string;
  name?: string;
  kind?: string;
  path?: string;
  ui?: string;
};

export default function LabMenu({ onOpenModule }: { onOpenModule?: (entry: ModuleEntry) => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registry, setRegistry] = useState<Record<string, ModuleEntry[]>>({ panels: [], tools: [], jobs: [], devices: [], datasets: [], exporters: [] });

  useEffect(() => {
    let mounted = true;
    fetch('/api/registry').then(async (r) => {
      if (!r.ok) throw new Error('registry fetch failed');
      const data = await r.json();
      if (!mounted) return;
      setRegistry(data);
      setLoading(false);
    }).catch((e) => { if (mounted) { setError(String(e)); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  function mkSection(title: string, items: ModuleEntry[]) {
    if (!items || items.length === 0) return null;
    return (
      <div className="lab-section" key={title}>
        <h3 className="lab-section-title">{title}</h3>
        <ul className="lab-section-list">
          {items.map((m) => (
            <li key={m.id} className="lab-item">
              <button type="button" className="lab-link" onClick={() => onOpenModule ? onOpenModule(m) : void(0)}>
                {m.name || m.id}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (loading) return <div className={styles['lab-loading']}>Loading modules...</div>;
  if (error) return <div className={styles['lab-error']}>Menu error: {error}</div>;

  return (
    <nav className={styles['lab-menu-root']}>
      {mkSection('Panels', registry.panels || [])}
      {mkSection('Tools', registry.tools || [])}
      {mkSection('Jobs', registry.jobs || [])}
      {mkSection('Devices', registry.devices || [])}
      {mkSection('Datasets', registry.datasets || [])}
      {mkSection('Exports', registry.exporters || [])}
    </nav>
  );
}
