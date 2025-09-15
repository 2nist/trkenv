import { useMemo, useState } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { swrFetcher } from "../../lib/api";

export default function LegacyPage() {
  const [text, setText] = useState<string>("Hello\nWorld");
  const [parsed, setParsed] = useState<number | null>(null);
  const [sample, setSample] = useState<string[]>([]);

  // Feature flag guard (client-side)
  const legacyEnabled = process.env.NEXT_PUBLIC_ENABLE_LEGACY === "true";
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  const pingUrl = useMemo(() => `${apiBase}/legacy/ping`, [apiBase]);
  const {
    data: pingData,
    isLoading: pingLoading,
    error: pingError,
    mutate: pingRefresh,
  } = useSWR(legacyEnabled ? pingUrl : null, swrFetcher);

  const parseUrl = useMemo(() => `${apiBase}/legacy/lyrics/parse`, [apiBase]);
  const { trigger: parseTrigger, isMutating } = useSWRMutation(
    legacyEnabled ? parseUrl : null,
    async (url: string, { arg }: { arg: string }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: arg,
      });
      const j = await res.json();
      return j;
    }
  );

  const doParse = async () => {
    const j = await parseTrigger(text);
    const lines = Array.isArray(j?.lines) ? j.lines : [];
    setParsed(lines.length);
    setSample(lines.slice(0, 10).map((l: any) => l?.text ?? ""));
  };

  return (
    <div className="p-4">
      <h1>Legacy</h1>
      {!legacyEnabled && (
        <div className="text-[#555] mb-3">
          Legacy sandbox is disabled. Set NEXT_PUBLIC_ENABLE_LEGACY=true to
          enable.
        </div>
      )}
      <div className="mb-3">
        <button
          onClick={() => pingRefresh()}
          disabled={!legacyEnabled || pingLoading}
        >
          {pingLoading ? "Pinging…" : "Ping legacy"}
        </button>
        <div>
          <small>
            {pingError
              ? String(pingError)
              : pingData
              ? JSON.stringify(pingData)
              : ""}
          </small>
        </div>
      </div>
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          cols={60}
        />
        <div>
          <button onClick={doParse} disabled={!legacyEnabled || isMutating}>
            {isMutating ? "Parsing…" : "Parse"}
          </button>
          {parsed !== null && <div>Lines parsed: {parsed}</div>}
          {parsed !== null && parsed > 0 && (
            <ul>
              {sample.map((t, i) => (
                <li key={i}>
                  {i + 1}. {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
