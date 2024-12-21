import { expect, it } from "vitest";
import {
  fromFileSystem,
  fromFileSystemSync,
  symlink,
} from "../src/utils";

it("should correctly handle symbolic links in the directory", () => {
  const mockFiles = {
    "file1.txt": "content1\n",
    "symlink.txt": symlink("file1.txt"),
    "symlinked-dir": symlink("nested"),
    "nested": {
      "file2.txt": "content2\n",
      "link-to-parent.txt": symlink("../file1.txt"),
    },
  };

  const result = fromFileSystemSync("./test/fixtures/symlinks");

  expect(result).toEqual(mockFiles);
});

it("should correctly handle symbolic links in the directory using async", async () => {
  const mockFiles = {
    "file1.txt": "content1\n",
    "symlink.txt": symlink("file1.txt"),
    "symlinked-dir": symlink("nested"),
    "nested": {
      "file2.txt": "content2\n",
      "link-to-parent.txt": symlink("../file1.txt"),
    },
  };

  const result = await fromFileSystem("./test/fixtures/symlinks");

  expect(result).toEqual(mockFiles);
});
