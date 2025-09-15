// Lightweight data layer around native fetch + a SWR fetcher
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class HttpError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

export async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson
    ? await res.json().catch(() => undefined)
    : await res.text();
  if (!res.ok) {
    const msg =
      (isJson && body?.detail) || body || res.statusText || "Request failed";
    throw new HttpError(String(msg), res.status, body);
  }
  return body as T;
}

export async function getJSON<T = any>(url: string, init?: RequestInit) {
  return request<T>(url, { ...(init || {}), method: "GET" });
}

export async function postJSON<T = any>(
  url: string,
  data: any,
  init?: RequestInit
) {
  return request<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(data),
    ...init,
  });
}

export async function putJSON<T = any>(
  url: string,
  data: any,
  init?: RequestInit
) {
  return request<T>(url, {
    method: "PUT",
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(data),
    ...init,
  });
}

export async function del<T = any>(url: string, init?: RequestInit) {
  return request<T>(url, { ...(init || {}), method: "DELETE" });
}

// SWR compatible fetcher for JSON endpoints
export const swrFetcher = (url: string) => getJSON(url);

// Normalize unknown errors to a human-friendly string for UI
export function errorMessage(err: unknown): string {
  try {
    // Treat as HttpError if it quacks like one (avoids instanceof issues across module boundaries)
    const e: any = err as any;
    const looksHttp =
      e &&
      typeof e === "object" &&
      "status" in e &&
      "message" in e &&
      "body" in e;
    if (err instanceof HttpError || looksHttp) {
      const status = Number(e?.status) || 0;
      const msg = typeof e?.message === "string" ? e.message : "";
      const body = e?.body;
      if (typeof body === "string" && body.trim()) return body;
      if (body && typeof body === "object") {
        if (typeof body.detail === "string") return body.detail;
        try {
          return JSON.stringify(body);
        } catch {}
      }
      return msg || (status ? `HTTP ${status}` : "Request failed");
    }
    if (err && typeof err === "object") {
      const anyErr = err as any;
      if (typeof anyErr?.message === "string") return anyErr.message;
      try {
        return JSON.stringify(err);
      } catch {
        /* ignore */
      }
    }
    return String(err);
  } catch {
    return "Unexpected error";
  }
}
