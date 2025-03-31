import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect } from "vitest";
import { it } from "../src/vitest";

describe("vitest integration", () => {
  it("should create a test directory with default options", async ({ testdir }) => {
    const dir = await testdir({
      "file.txt": "Hello World",
      "nested/file.json": JSON.stringify({ key: "value" }),
    });

    expect(existsSync(dir)).toBe(true);
    expect(existsSync(join(dir, "file.txt"))).toBe(true);
    expect(existsSync(join(dir, "nested/file.json"))).toBe(true);
    expect(readFileSync(join(dir, "file.txt"), "utf-8")).toBe("Hello World");
    expect(JSON.parse(readFileSync(join(dir, "nested/file.json"), "utf-8"))).toEqual({ key: "value" });
  });

  it("should allow overriding options per testdir call", async ({ testdir }) => {
    const dir = await testdir({
      "file.txt": "Hello World",
    }, {
      dirname: "override-dir",
    });

    expect(dir).toContain("override-dir");
  });
});
