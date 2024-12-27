import { readFile, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { expect, it } from "vitest";
import { testdir, withMetadata } from "../src";

it.runIf(platform() === "win32")("windows", async () => {
  const path = await testdir({
    "file1.txt": withMetadata("Hello, World!", { mode: 0o644 }),
    "dir1": {
      "file2.txt": withMetadata("Hello, World!", { mode: 0o444 }),
      "dir2": withMetadata({
        "file3.txt": "Hello, World!",
      }, { mode: 0o555 }),
    },
  });

  try {
    await writeFile(`${path}/dir1/dir2/file3.txt`, "Hello, Vitest!");
    // This should throw an error, but not on Windows
  } catch (err) {
    console.error(err);
  }

  const content = await readFile(`${path}/dir1/dir2/file3.txt`, "utf8");
  // The content is now changes, but it should not be possible to write to the file

  expect(content).not.toBe("Hello, Vitest!");
  expect(content).toBe("Hello, World!");
});
