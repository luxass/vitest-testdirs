import { readFile, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { expect, it } from "vitest";
import { testdir, withMetadata } from "../src";

it.runIf(platform() === "win32")("windows", async () => {
  const path = await testdir({
    "file1.txt": withMetadata("Hello, World!", { mode: 0o444 }),
  });

  try {
    await writeFile(`${path}/file1.txt`, "Hello, Vitest!");
    // This should throw an error, but not on Windows
  } catch (err) {
    console.error(err);
  }

  const content = await readFile(`${path}/file1.txt`, "utf8");
  // The content is now changes, but it should not be possible to write to the file

  expect(content).not.toBe("Hello, Vitest!");
  expect(content).toBe("Hello, World!");
});