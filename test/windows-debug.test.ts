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
});
