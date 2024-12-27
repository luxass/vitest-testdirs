import { stat } from "node:fs/promises";
import { platform } from "node:os";
import { it } from "vitest";
import { createFileTreeSync } from "../src/file-tree";
import { withMetadata } from "../src/utils";

it.runIf(platform() === "win32")("should be able to create files with different permissions", async () => {
  const files = {
    "file1.txt": withMetadata("Hello, world!", { mode: 0o644 }),
    "dir1": {
      "file2.txt": withMetadata("This is file 2", { mode: 0o444 }),
      "dir2": withMetadata({
        "file3.txt": "This is file 3",
      }, { mode: 0o555 }),
    },
  };

  createFileTreeSync("./.vitest-testdirs/windows-test", files);

  const file1Stats = await stat("./.vitest-testdirs/windows-test/file1.txt");
  console.error("file1", file1Stats);

  const dir1Stats = await stat("./.vitest-testdirs/windows-test/dir1");
  console.error("dir1", dir1Stats);

  const file2Stats = await stat("./.vitest-testdirs/windows-test/dir1/file2.txt");
  console.error("file2", file2Stats);

  const dir2Stats = await stat("./.vitest-testdirs/windows-test/dir1/dir2");
  console.error("dir2", dir2Stats);
});
