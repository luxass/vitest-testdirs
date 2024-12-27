import { readFile, writeFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { testdir, withMetadata } from "../src";

it("windows", async () => {
  const path = await testdir({
    "file1.txt": withMetadata("Hello, World!", { mode: 0o444 }),
  });

  try {
    await writeFile(`${path}/file1.txt`, "Hello, Vitest!");
    // This should throw an error, but not on Windows
  } catch {}

  const content = await readFile(`${path}/file1.txt`, "utf8");
  // The content is now changes, but it should not be possible to write to the file

  expect(content).not.toBe("Hello, Vitest!");
  expect(content).toBe("Hello, World!");
});
