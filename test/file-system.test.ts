import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { fromFileSystem, fromFileSystemSync } from "../src/file-system";
import { symlink, testdir, testdirSync } from "../src/utils";

describe("invalid paths or directories", () => {
  it("should return an empty object if the path does not exist", async () => {
    const result = await fromFileSystem("non-existent-path");

    expect(result).toEqual({});
  });

  it("should return an empty object if the path does not exist (sync)", () => {
    const result = fromFileSystemSync("non-existent-path");

    expect(result).toEqual({});
  });

  it("should return an empty object if the path is not a directory", async () => {
    const result = await fromFileSystem("not-a-directory");

    expect(result).toEqual({});
  });

  it("should return an empty object if the path is not a directory (sync)", () => {
    const result = fromFileSystemSync("not-a-directory");

    expect(result).toEqual({});
  });
});

describe("handle symlinks", () => {
  it("should correctly handle symbolic links in the directory", async () => {
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

  it("should correctly handle symbolic links in the directory (sync)", () => {
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

  it("should handle symbolic links using testdir", async () => {
    const files = await fromFileSystem("./test/fixtures/symlinks");

    const path = await testdir(files);

    const rootReadme = await readFile("./README.md", "utf8");
    const testdirReadme = await readFile(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

    expect(rootReadme).toStrictEqual(testdirReadme);
  });

  it("should handle symbolic links using testdir (sync)", () => {
    const files = fromFileSystemSync("./test/fixtures/symlinks");

    const path = testdirSync(files);

    const rootReadme = readFileSync("./README.md", "utf8");
    const testdirReadme = readFileSync(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

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

  it("should handle symbolic links using testdir with custom path (sync)", () => {
    const files = fromFileSystemSync("./test/fixtures/symlinks");

    const path = testdirSync(files, {
      dirname: "./three/levels/deep-sync",
    });

    const rootReadme = readFileSync("./README.md", "utf8");
    const testdirReadme = readFileSync(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

    expect(rootReadme).toStrictEqual(testdirReadme);
  });
});

describe("map file contents", () => {
  it("should return the directory structure with file contents", async () => {
    const mockFiles = {
      "file.txt": "this is just a file!\n",
      "README.md": "# vitest-testdirs\n",
      "nested": {
        "README.md": "# Nested Fixture Folder\n",
        // TODO: use buffer after https://github.com/luxass/vitest-testdirs/issues/66 is fixed
        // "image.txt": Buffer.from([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33, 10]),
        "image.txt": "Hello, World!\n",
      },
    };

    const result = await fromFileSystem("./test/fixtures/file-system/test-dir");

    expect(result).toMatchObject(mockFiles);
  });

  it("should return the directory structure with file contents (sync)", () => {
    const mockFiles = {
      "file.txt": "this is just a file!\n",
      "README.md": "# vitest-testdirs\n",
      "nested": {
        "README.md": "# Nested Fixture Folder\n",
        // TODO: use buffer after https://github.com/luxass/vitest-testdirs/issues/66 is fixed
        // "image.txt": Buffer.from([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33, 10]),
        "image.txt": "Hello, World!\n",
      },
    };

    const result = fromFileSystemSync("./test/fixtures/file-system/test-dir");

    expect(result).toMatchObject(mockFiles);
  });

  it("should use different encodings when using `getEncodingForFile`", async () => {
    const mockFiles = {
      "file.txt": "this is just a file!\n",
      "README.md": "# vitest-testdirs\n",
      "nested": {
        "README.md": "# Nested Fixture Folder\n",
        // eslint-disable-next-line node/prefer-global/buffer
        "image.txt": Buffer.from([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33, 10]),
      },
    };

    const result = await fromFileSystem("./test/fixtures/file-system/test-dir", {
      getEncodingForFile: (path) => {
        return path.endsWith("image.txt") ? null : "utf8";
      },
    });

    expect(result).toMatchObject(mockFiles);
  });

  it("should use different encodings when using `getEncodingForFile` (sync)", () => {
    const mockFiles = {
      "file.txt": "this is just a file!\n",
      "README.md": "# vitest-testdirs\n",
      "nested": {
        "README.md": "# Nested Fixture Folder\n",
        // eslint-disable-next-line node/prefer-global/buffer
        "image.txt": Buffer.from([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33, 10]),
      },
    };

    const result = fromFileSystemSync("./test/fixtures/file-system/test-dir", {
      getEncodingForFile: (path) => {
        return path.endsWith("image.txt") ? null : "utf8";
      },
    });

    expect(result).toMatchObject(mockFiles);
  });
});
