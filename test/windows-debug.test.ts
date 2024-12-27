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
  console.error({
    mode: (file1Stats.mode & 0o644).toString(8),
    stats: JSON.stringify(file1Stats, null, 2),
  });

  const dir1Stats = await stat("./.vitest-testdirs/windows-test/dir1");
  console.error({
    mode: (dir1Stats.mode & 0o777).toString(8),
    stats: JSON.stringify(dir1Stats, null, 2),
  });

  const file2Stats = await stat("./.vitest-testdirs/windows-test/dir1/file2.txt");
  console.error({
    mode: (file2Stats.mode & 0o444).toString(8),
    stats: JSON.stringify(file2Stats, null, 2),
  });

  const dir2Stats = await stat("./.vitest-testdirs/windows-test/dir1/dir2");
  console.error({
    mode: (dir2Stats.mode & 0o777).toString(8),
    stats: JSON.stringify(dir2Stats, null, 2),
  });
});
