import { afterEach, describe, expect, it } from "vitest"
import { clearSeat, getSeat, storeSeat } from "./resume-storage"

describe("resume-storage", () => {
  afterEach(() => {
    window.sessionStorage.clear()
  })

  it("round trips a stored seat under the tw:resume:<CODE> key", () => {
    storeSeat("ABC123", { playerId: "p1", resumeToken: "tok-a-long-secret" })
    expect(window.sessionStorage.getItem("tw:resume:ABC123")).toBe(
      JSON.stringify({ playerId: "p1", resumeToken: "tok-a-long-secret" }),
    )
    expect(getSeat("ABC123")).toEqual({ playerId: "p1", resumeToken: "tok-a-long-secret" })
  })

  it("returns null when no seat is stored", () => {
    expect(getSeat("ZZZ999")).toBeNull()
  })

  it("treats malformed or partial payloads as missing (AC-5)", () => {
    // A seat without a token must never be handed back as resumeable.
    window.sessionStorage.setItem("tw:resume:AAA111", JSON.stringify({ playerId: "p1" }))
    window.sessionStorage.setItem("tw:resume:BBB222", "not json")
    expect(getSeat("AAA111")).toBeNull()
    expect(getSeat("BBB222")).toBeNull()
  })

  it("clearSeat removes only the seat for that room", () => {
    storeSeat("AAA111", { playerId: "p1", resumeToken: "t1" })
    storeSeat("BBB222", { playerId: "p2", resumeToken: "t2" })
    clearSeat("AAA111")
    expect(getSeat("AAA111")).toBeNull()
    expect(getSeat("BBB222")).toEqual({ playerId: "p2", resumeToken: "t2" })
  })

  it("survives storage failures without throwing (private mode)", () => {
    // The try/catch in the storage module is exercised by a storage that
    // refuses writes of falsy payloads; a throwing quota must not bubble up.
    const original = window.sessionStorage.setItem.bind(window.sessionStorage)
    // Some hosts brand Storage methods; simulate failure by storing a value
    // that getSeat will refuse instead of asserting on the patch.
    window.sessionStorage.setItem = () => {
      throw new Error("quota exceeded")
    }
    expect(() => storeSeat("AAA111", { playerId: "p1", resumeToken: "t1" })).not.toThrow()
    window.sessionStorage.setItem = original
  })
})