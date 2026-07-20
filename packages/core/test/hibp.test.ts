import { describe, it, expect, vi, afterEach } from "vitest";
import { checkHibp, hibpFinding } from "../src/hibp.js";

describe("checkHibp", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns breached: true when suffix is found in HIBP range response", async () => {
    const data = new TextEncoder().encode("password");
    const digest = await crypto.subtle.digest("SHA-1", data);
    const fullHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const suffix = fullHash.slice(5);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`${suffix}:3730471\nOTHERSUFFIX00000000000000000000:5`),
      })
    );

    const result = await checkHibp("password");
    expect(result.breached).toBe(true);
    expect(result.count).toBe(3730471);
  });

  it("returns breached: false when suffix is not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("AAAA0000000000000000000000000000:1"),
      })
    );

    const result = await checkHibp("some-unbreached-password-xyz");
    expect(result.breached).toBe(false);
  });

  it("throws when the HIBP API responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(checkHibp("password")).rejects.toThrow();
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
