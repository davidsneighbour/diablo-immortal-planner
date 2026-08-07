import { describe, expect, it } from "vitest";
import { createId, idKind, isIdOfKind } from "./id.js";

describe("createId", () => {
  it('produces a "kind:slug" identifier', () => {
    expect(createId("activity", "elder-rift")).toBe("activity:elder-rift");
  });

  it("rejects slugs that are not lowercase kebab-case", () => {
    expect(() => createId("activity", "Elder Rift")).toThrow(/kebab-case/);
    expect(() => createId("activity", "elder_rift")).toThrow(/kebab-case/);
    expect(() => createId("activity", "")).toThrow(/kebab-case/);
  });
});

describe("idKind", () => {
  it("returns the prefix before the first colon", () => {
    expect(idKind(createId("resource", "telluric-pearl"))).toBe("resource");
  });
});

describe("isIdOfKind", () => {
  it("distinguishes IDs by their kind prefix", () => {
    const activityId = createId("activity", "elder-rift");
    expect(isIdOfKind(activityId, "activity")).toBe(true);
    expect(isIdOfKind(activityId, "resource")).toBe(false);
  });

  it('renaming the slug does not change the kind, matching the "IDs are independent of display names" rule', () => {
    const before = createId("activity", "elder-rift");
    const after = createId("activity", "elder-rift-v2");
    expect(idKind(before)).toBe(idKind(after));
    expect(before).not.toBe(after);
  });
});
