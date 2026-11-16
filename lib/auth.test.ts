import { afterEach, describe, expect, it } from "vitest";
import { isValidSession, requestHasSession, safeEqual, safeNextPath, sessionTokenFor, SESSION_COOKIE } from "@/lib/auth";

afterEach(() => {
  delete process.env.APP_PASSCODE;
});

describe("passcode gate (L35)", () => {
  it("is open when APP_PASSCODE is unset", async () => {
    expect(await isValidSession(undefined)).toBe(true);
  });

  it("accepts only the token for the current passcode", async () => {
    process.env.APP_PASSCODE = "fern-and-friends";
    const token = await sessionTokenFor("fern-and-friends");
    expect(await isValidSession(token)).toBe(true);
    expect(await isValidSession(undefined)).toBe(false);
    expect(await isValidSession("garbage")).toBe(false);
    // Rotating the passcode invalidates old cookies.
    process.env.APP_PASSCODE = "new-passcode";
    expect(await isValidSession(token)).toBe(false);
  });

  it("reads the cookie off a raw Request", async () => {
    process.env.APP_PASSCODE = "pw";
    const token = await sessionTokenFor("pw");
    const ok = new Request("https://x.test/", { headers: { cookie: `a=1; ${SESSION_COOKIE}=${token}` } });
    const bad = new Request("https://x.test/", { headers: { cookie: "a=1" } });
    expect(await requestHasSession(ok)).toBe(true);
    expect(await requestHasSession(bad)).toBe(false);
  });

  it("safeEqual handles length mismatch", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });

  it("never redirects off-site or back to /login", () => {
    expect(safeNextPath("/garden")).toBe("/garden");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("/login?next=/x")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});
