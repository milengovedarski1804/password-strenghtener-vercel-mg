import { describe, it, expect, vi, afterEach } from "vitest";
import { checkHibp, hibpFinding, HibpError } from "../src/hibp.js";

async function sha1Upper(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

const OTHER = "0".repeat(35);
const noSleep = () => Promise.resolve();

function okResponse(body: string) {
  return { ok: true, status: 200, headers: new Headers(), text: () => Promise.resolve(body) } as unknown as Response;
}
function errorResponse(status: number, headers: Record<string, string> = {}) {
  return { ok: false, status, headers: new Headers(headers), text: () => Promise.resolve("") } as unknown as Response;
}

describe("checkHibp - основен сценарий", () => {
  afterEach(() => vi.restoreAllMocks());

  it("открива парола, чийто суфикс присъства в отговора", async () => {
    const suffix = (await sha1Upper("password")).slice(5);
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(`${suffix}:3730471\n${OTHER}:5`));
    const result = await checkHibp("password", { fetchImpl });
    expect(result).toEqual({ breached: true, count: 3730471 });
  });

  it("връща breached: false, когато суфиксът липсва", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(`${OTHER}:1`));
    const result = await checkHibp("some-unbreached-password-xyz", { fetchImpl });
    expect(result).toEqual({ breached: false, count: 0 });
  });

  it("изпраща само 5-символния префикс без нестандартни заглавия", async () => {
    const hash = await sha1Upper("password");
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(`${OTHER}:1`));
    await checkHibp("password", { fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    expect(String(url)).not.toContain(hash.slice(5));
    expect((init as RequestInit).headers).toBeUndefined();
  });

  it("пренебрегва редове-пълнеж с брой 0", async () => {
    const suffix = (await sha1Upper("password")).slice(5);
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(`${suffix}:0\n${OTHER}:7`));
    const result = await checkHibp("password", { fetchImpl });
    expect(result.breached).toBe(false);
  });

  it("работи и със стария вид на глобалния fetch (без заглавия в отговора)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(`${OTHER}:1`) }));
    await expect(checkHibp("x")).resolves.toEqual({ breached: false, count: 0 });
  });
});

describe("checkHibp - надеждност и HTTP статуси", () => {
  it("при HTTP 503 опитва отново и успява при втория опит", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(okResponse(`${OTHER}:1`));
    const result = await checkHibp("x", { fetchImpl, sleep: noSleep });
    expect(result.breached).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("при постоянна HTTP 503 хвърля server_error със статуса", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(503));
    const err = await checkHibp("x", { fetchImpl, sleep: noSleep }).catch((e) => e);
    expect(err).toBeInstanceOf(HibpError);
    expect(err.kind).toBe("server_error");
    expect(err.status).toBe(503);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("при HTTP 429 спазва Retry-After и опитва отново", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(errorResponse(429, { "Retry-After": "2" }))
      .mockResolvedValueOnce(okResponse(`${OTHER}:1`));
    await checkHibp("x", { fetchImpl, sleep });
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("при постоянна HTTP 429 хвърля rate_limited", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(429));
    const err = await checkHibp("x", { fetchImpl, sleep: noSleep }).catch((e) => e);
    expect(err.kind).toBe("rate_limited");
    expect(err.status).toBe(429);
  });

  it("при HTTP 404 не опитва отново и хвърля http_error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(404));
    const err = await checkHibp("x", { fetchImpl, sleep: noSleep }).catch((e) => e);
    expect(err.kind).toBe("http_error");
    expect(err.status).toBe(404);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("при липса на мрежа хвърля network", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await checkHibp("x", { fetchImpl, sleep: noSleep }).catch((e) => e);
    expect(err.kind).toBe("network");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("при бавен отговор прекъсва заявката и хвърля timeout", async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })
    ) as unknown as typeof fetch;
    const err = await checkHibp("x", { fetchImpl, timeoutMs: 20, retries: 0 }).catch((e) => e);
    expect(err.kind).toBe("timeout");
  });

  it("при невалидно съдържание хвърля invalid_response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse("<html>maintenance</html>"));
    const err = await checkHibp("x", { fetchImpl }).catch((e) => e);
    expect(err.kind).toBe("invalid_response");
  });
});

describe("hibpFinding", () => {
  it("returns null when not breached", () => {
    expect(hibpFinding({ breached: false, count: 0 })).toBeNull();
  });

  it("returns a critical breached_password finding when breached", () => {
    const finding = hibpFinding({ breached: true, count: 4173 });
    expect(finding?.category).toBe("breached_password");
    expect(finding?.severity).toBe("critical");
    expect(finding?.detail).toBeTruthy();
  });
});
