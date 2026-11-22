import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { testdir } from "../src";

let suiteDirectory: string | undefined;

// The file-level hook runs after the nested suite's cleanup hooks.
afterAll(async () => {
  if (suiteDirectory !== undefined) {
    await expect(stat(suiteDirectory)).rejects.toMatchObject({ code: "ENOENT" });
  }
});

describe("suite-scoped testdir", async () => {
  const directory = await testdir({ "shared.txt": "suite fixture" });
  suiteDirectory = directory;
  const fixturePath = join(directory, "shared.txt");

  it("creates the fixture before the first test", async () => {
    expect(await readFile(fixturePath, "utf8")).toBe("suite fixture");
  });

  it("keeps the fixture available to the next test", async () => {
    expect(await readFile(fixturePath, "utf8")).toBe("suite fixture");
  });
});
