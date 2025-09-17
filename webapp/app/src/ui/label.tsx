export function Label({
  text = "[trk]",
  tone = "ink",
  className = "",
}: { text?: string; tone?: "ink" | "accent"; className?: string }) {
  const styles =
    tone === "accent"
      ? "bg-[#D64541] text-[#fff0e8]"
      : "bg-[#1a1a1a] text-[#efe3cc]";
  return (
    <span
      className={`font-dymo inline-block rounded-[6px] px-2.5 py-0.5 shadow-[0_1px_0_rgba(0,0,0,.35),0_3px_8px_rgba(0,0,0,.18)] ${styles} ${className}`}
    >
      {text}
    </span>
  );
}

export function Tape({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`bg-[#efe3cc] text-[#1a1a1a] border border-[#000]/15 rounded-[3px] px-2 py-1 shadow-[0_1px_0_rgba(0,0,0,.25)] ${className}`}
    >
      {children}
    </div>
  );
}
