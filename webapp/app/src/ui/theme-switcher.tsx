import React from 'react';

export function ThemeSwitcher({ themes, onSet }: { themes: string[]; onSet: (t: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="ml-4 relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="px-2 py-1 rounded bg-[#fff] text-black border"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Select theme"
      >
        Theme
      </button>
      {open && (
        <div role="menu" aria-label="Theme menu" className="absolute right-0 mt-1 w-36 bg-white border shadow">
          {themes.map((t) => (
            <div key={t} role="menuitem">
              <button
                onClick={() => {
                  onSet(t);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1 hover:bg-gray-100"
              >
                {t}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
