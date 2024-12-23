import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  fromFileSystem,
  fromFileSystemSync,
} from "../src/file-system";
import { symlink, testdir, testdirSync } from "../src/utils";

describe("fromFileSystem", () => {
  it("should correctly handle symbolic links in the directory using async", async () => {
    const mockFiles = {
      "file1.txt": "content1\n",
      "symlink.txt": symlink("file1.txt"),
      "symlinked-dir": symlink("nested"),
      "nested": {
        "file2.txt": "content2\n",
        "link-to-parent.txt": symlink("../file1.txt"),
        "double-nested": {
          "file3.txt": "content3\n",
          "link-to-parent.txt": symlink("../../file1.txt"),
          "double-double-nested": {
            "README.md": symlink("../../../../../../README.md"),
          },
        },
      },
    };

    const result = await fromFileSystem("./test/fixtures/symlinks");

    expect(result).toMatchObject(mockFiles);
  });

  it("should handle symbolic links using testdir", async () => {
    const files = await fromFileSystem("./test/fixtures/symlinks");

    const path = await testdir(files);

    const rootReadme = await readFile("./README.md", "utf8");
    const testdirReadme = await readFile(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

    expect(rootReadme).toStrictEqual(testdirReadme);
  });

  it("should handle symbolic links using testdir with custom path", async () => {
    const files = await fromFileSystem("./test/fixtures/symlinks");

    const path = await testdir(files, {
      dirname: "./three/levels/deep",
    });

    const rootReadme = await readFile("./README.md", "utf8");
    const testdirReadme = await readFile(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

    expect(rootReadme).toStrictEqual(testdirReadme);
  });
});

describe("fromFileSystemSync", () => {
  it("should correctly handle symbolic links in the directory", () => {
    const mockFiles = {
      "file1.txt": "content1\n",
      "symlink.txt": symlink("file1.txt"),
      "symlinked-dir": symlink("nested"),
      "nested": {
        "file2.txt": "content2\n",
        "link-to-parent.txt": symlink("../file1.txt"),
        "double-nested": {
          "file3.txt": "content3\n",
          "link-to-parent.txt": symlink("../../file1.txt"),
          "double-double-nested": {
            "README.md": symlink("../../../../../../README.md"),
          },
        },
      },
    };

    const result = fromFileSystemSync("./test/fixtures/symlinks");

    expect(result).toMatchObject(mockFiles);
  });

  it("should handle symbolic links using testdir", () => {
    const files = fromFileSystemSync("./test/fixtures/symlinks");

    const path = testdirSync(files);

    const rootReadme = readFileSync("./README.md", "utf8");
    const testdirReadme = readFileSync(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

    expect(rootReadme).toStrictEqual(testdirReadme);
  });

  it("should handle symbolic links using testdir with custom path", () => {
    const files = fromFileSystemSync("./test/fixtures/symlinks");

    const path = testdirSync(files, {
      dirname: "./three/levels/deep-sync",
    });

    const rootReadme = readFileSync("./README.md", "utf8");
    const testdirReadme = readFileSync(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

    expect(rootReadme).toStrictEqual(testdirReadme);
  });
});
