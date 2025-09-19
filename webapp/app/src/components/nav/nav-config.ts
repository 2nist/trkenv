export type NavItem = {
  label: string;
  href?: string;
  external?: boolean;
  children?: NavItem[];
};

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workbench',
    items: [
      { label: 'Dashboard', href: '/' },
      { label: 'Design System', href: '/design' },
      { label: 'Palette Canvas', href: '/palette' },
    ],
  },
  {
    title: 'Library',
    items: [
      { label: 'Songs', href: '/songs' },
      { label: 'Imports', href: '/import' },
    ],
  },
  {
    title: 'Projects',
    items: [
      { label: 'Rehearsal', href: '/experiments/rehearsal' },
      { label: 'Audio Engine', href: '/experiments/audio-engine' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Cylindrical Timeline', href: '/cylindrical' },
      { label: 'Playhead (Classic)', href: '/playhead' },
      { label: 'Editor', href: '/editor' },
      { label: 'Record', href: '/record' },
    ],
  },
];
