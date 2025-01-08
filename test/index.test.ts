import fs from "node:fs";
import fsAsync from "node:fs/promises";
import { platform } from "node:os";
import { join, normalize, resolve } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { getCurrentSuite, getCurrentTest } from "vitest/suite";
import {
  createDirnameFromTask,
  createFileTree,
  createFileTreeSync,
  fromFileSystem,
  fromFileSystemSync,
  link,
  metadata,
  symlink,
  testdir,
  testdirSync,
} from "../src";

function cleanup(path: string) {
  onTestFinished(async () => {
    await fsAsync.rm(path, { recursive: true });
  });
}

describe("testdir", () => {
  it("should create a test directory with the specified files", async () => {
    const files = {
      "file1.txt": "content1",
      "file2.txt": "content2",
      "subdir": {
        "file3.txt": "content3",
      },
    };

    const dirname = await testdir(files);

    expect(await fsAsync.readdir(dirname)).toEqual(
      expect.arrayContaining(["file1.txt", "file2.txt", "subdir"]),
    );
    expect(await fsAsync.readdir(join(dirname, "subdir"))).toEqual(["file3.txt"]);
    expect(await fsAsync.readFile(join(dirname, "file1.txt"), "utf8")).toBe("content1");
    expect(await fsAsync.readFile(join(dirname, "file2.txt"), "utf8")).toBe("content2");
    expect(await fsAsync.readFile(join(dirname, "subdir", "file3.txt"), "utf8")).toBe(
      "content3",
    );
  });

  it("should generate a directory name based on the test name if dirname is not provided", async () => {
    const files = {
      "file.txt": "content",
    };

    const dirname = await testdir(files);
    expect(dirname).toBe(
      normalize(
        ".vitest-testdirs/vitest-index-testdir-should-generate-a-directory-name-based-on-the-test-name-if-dirname-is-not-provided",
      ),
    );
  });

  it("should generate a directory name based on the provided dirname", async () => {
    const files = {
      "file.txt": "content",
    };

    const dirname = await testdir(files, { dirname: "custom-dirname" });
    expect(dirname).toBe(normalize(".vitest-testdirs/custom-dirname"));
  });

  it("should cleanup the directory after the test has finished if cleanup option is true", async () => {
    const files = {
      "file.txt": "content",
    };

    // we need to have the onTestFinished callback before calling testdir
    // otherwise the order that they are called is testdir first, and then ours.
    // which means that our onTestFinished callback will be called before the one from testdir
    onTestFinished(() => {
      const dirname = createDirnameFromTask(getCurrentTest() || getCurrentSuite());
      expect(fsAsync.readdir(dirname)).rejects.toThrow();
    });

    const dirname = await testdir(files, { cleanup: true });
    expect(await fsAsync.readdir(dirname)).toEqual(["file.txt"]);
  });

  it("should allow the directory to be created outside of the `.vitest-testdirs` directory if allowOutside is true", async () => {
    const files = {
      "file.txt": "content",
    };

    const dirname = await testdir(files, { allowOutside: true });
    expect(await fsAsync.readdir(dirname)).toEqual(["file.txt"]);
  });

  it("should throw error if directory will be created outside of `.vitest-testdirs` by default", async () => {
    const files = {
      "file.txt": "content",
    };

    await expect(
      testdir(files, {
        dirname: "../testdir",
      }),
    ).rejects.toThrowError(
      "The directory name must start with '.vitest-testdirs'",
    );
  });

  it("should create a test directory with with symlinks", async () => {
    const files = {
      "file1.txt": "content1",
      "file2.txt": "content2",
      "subdir": {
        "file3.txt": "content3",
        "file4.txt": link("../file1.txt"),
        "file5.txt": symlink("../file2.txt"),
      },
      "link4.txt": link("file1.txt"),
      "link5.txt": symlink("subdir/file3.txt"),
    };

    const dirname = await testdir(files);

    expect(await fsAsync.readdir(dirname)).toEqual(
      expect.arrayContaining([
        "file1.txt",
        "file2.txt",
        "link4.txt",
        "link5.txt",
        "subdir",
      ]),
    );

    expect(await fsAsync.readdir(join(dirname, "subdir"))).toEqual([
      "file3.txt",
      "file4.txt",
      "file5.txt",
    ]);
    expect(await fsAsync.readFile(join(dirname, "file1.txt"), "utf8")).toBe("content1");
    expect(await fsAsync.readFile(join(dirname, "file2.txt"), "utf8")).toBe("content2");
    expect(await fsAsync.readFile(join(dirname, "link4.txt"), "utf8")).toBe("content1");
    expect((await fsAsync.stat(join(dirname, "link4.txt"))).isFile()).toBe(true);

    expect(await fsAsync.readlink(join(dirname, "link5.txt"), "utf8")).toBeDefined();
    expect((await fsAsync.lstat(join(dirname, "link5.txt"))).isSymbolicLink()).toBe(
      true,
    );

    expect(await fsAsync.readFile(join(dirname, "subdir", "file3.txt"), "utf8")).toBe(
      "content3",
    );

    expect(await fsAsync.readFile(join(dirname, "subdir", "file4.txt"), "utf8")).toBe(
      "content1",
    );
    expect((await fsAsync.stat(join(dirname, "subdir", "file4.txt"))).isFile()).toBe(
      true,
    );

    expect(
      await fsAsync.readlink(join(dirname, "subdir", "file5.txt"), "utf8"),
    ).toBeDefined();
    expect(
      (await fsAsync.lstat(join(dirname, "subdir", "file5.txt"))).isSymbolicLink(),
    ).toBe(true);
  });
});

describe("testdirSync", () => {
  it("should create a test directory with the specified files", () => {
    const files = {
      "file1.txt": "content1",
      "file2.txt": "content2",
      "subdir": {
        "file3.txt": "content3",
      },
    };

    const dirname = testdirSync(files);

    expect(fs.readdirSync(dirname)).toEqual(
      expect.arrayContaining(["file1.txt", "file2.txt", "subdir"]),
    );
    expect(fs.readdirSync(join(dirname, "subdir"))).toEqual(["file3.txt"]);
    expect(fs.readFileSync(join(dirname, "file1.txt"), "utf8")).toBe("content1");
    expect(fs.readFileSync(join(dirname, "file2.txt"), "utf8")).toBe("content2");
    expect(fs.readFileSync(join(dirname, "subdir", "file3.txt"), "utf8")).toBe(
      "content3",
    );
  });

  it("should generate a directory name based on the test name if dirname is not provided", () => {
    const files = {
      "file.txt": "content",
    };

    const dirname = testdirSync(files);
    expect(dirname).toBe(
      normalize(
        ".vitest-testdirs/vitest-index-testdirSync-should-generate-a-directory-name-based-on-the-test-name-if-dirname-is-not-provided",
      ),
    );
  });

  it("should generate a directory name based on the provided dirname", () => {
    const files = {
      "file.txt": "content",
    };

    const dirname = testdirSync(files, { dirname: "custom-dirname" });
    expect(dirname).toBe(normalize(".vitest-testdirs/custom-dirname"));
  });

  it("should cleanup the directory after the test has finished if cleanup option is true", () => {
    const files = {
      "file.txt": "content",
    };

    // we need to have the onTestFinished callback before calling testdir
    // otherwise the order that they are called is testdir first, and then ours.
    // which means that our onTestFinished callback will be called before the one from testdir
    onTestFinished(() => {
      const dirname = createDirnameFromTask(getCurrentTest() || getCurrentSuite());
      expect(fsAsync.readdir(dirname)).rejects.toThrow();
    });

    const dirname = testdirSync(files, { cleanup: true });
    expect(fs.readdirSync(dirname)).toEqual(["file.txt"]);
  });

  it("should allow the directory to be created outside of the `.vitest-testdirs` directory if allowOutside is true", () => {
    const files = {
      "file.txt": "content",
    };

    const dirname = testdirSync(files, { allowOutside: true });
    expect(fs.readdirSync(dirname)).toEqual(["file.txt"]);
  });

  it("should throw error if directory will be created outside of `.vitest-testdirs` by default", () => {
    const files = {
      "file.txt": "content",
    };

    expect(() =>
      testdirSync(files, {
        dirname: "../testdir",
      }),
    ).toThrowError("The directory name must start with '.vitest-testdirs'");
  });

  it("should create a test directory with with symlinks", () => {
    const files = {
      "file1.txt": "content1",
      "file2.txt": "content2",
      "subdir": {
        "file3.txt": "content3",
        "file4.txt": link("../file1.txt"),
        "file5.txt": symlink("../file2.txt"),
      },
      "link4.txt": link("file1.txt"),
      "link5.txt": symlink("subdir/file3.txt"),
    };

    const dirname = testdirSync(files);

    expect(fs.readdirSync(dirname)).toEqual(
      expect.arrayContaining([
        "file1.txt",
        "file2.txt",
        "link4.txt",
        "link5.txt",
        "subdir",
      ]),
    );

    expect(fs.readdirSync(join(dirname, "subdir"))).toEqual([
      "file3.txt",
      "file4.txt",
      "file5.txt",
    ]);
    expect(fs.readFileSync(join(dirname, "file1.txt"), "utf8")).toBe("content1");
    expect(fs.readFileSync(join(dirname, "file2.txt"), "utf8")).toBe("content2");
    expect(fs.readFileSync(join(dirname, "link4.txt"), "utf8")).toBe("content1");
    expect(fs.statSync(join(dirname, "link4.txt")).isFile()).toBe(true);

    expect(fs.readlinkSync(join(dirname, "link5.txt"), "utf8")).toBeDefined();
    expect(fs.lstatSync(join(dirname, "link5.txt")).isSymbolicLink()).toBe(true);

    expect(fs.readFileSync(join(dirname, "subdir", "file3.txt"), "utf8")).toBe(
      "content3",
    );

    expect(fs.readFileSync(join(dirname, "subdir", "file4.txt"), "utf8")).toBe(
      "content1",
    );
    expect(fs.statSync(join(dirname, "subdir", "file4.txt")).isFile()).toBe(true);

    expect(
      fs.readlinkSync(join(dirname, "subdir", "file5.txt"), "utf8"),
    ).toBeDefined();
    expect(
      fs.lstatSync(join(dirname, "subdir", "file5.txt")).isSymbolicLink(),
    ).toBe(true);
  });
});

describe("createFileTree", () => {
  it("should create a file tree at the specified path", async () => {
    const path = "./.vitest-testdirs/specified-path";
    cleanup(path);

    const files = {
      "file1.txt": "Hello, world!",
      "this/is/nested.txt": "This is a file",
      "dir1": {
        "file2.txt": "This is file 2",
        "dir2": {
          "file3.txt": "This is file 3",
        },
      },
    };

    await createFileTree(path, files);
    const file1Content = await fsAsync.readFile(resolve(path, "file1.txt"), "utf-8");
    expect(file1Content).toBe("Hello, world!");

    const file2Content = await fsAsync.readFile(
      resolve(path, "dir1/file2.txt"),
      "utf-8",
    );
    expect(file2Content).toBe("This is file 2");

    const file3Content = await fsAsync.readFile(
      resolve(path, "dir1/dir2/file3.txt"),
      "utf-8",
    );
    expect(file3Content).toBe("This is file 3");

    const nestedFile = await fsAsync.readdir(resolve(path, "this/is"));
    expect(nestedFile).toEqual(["nested.txt"]);

    const nestedFileContent = await fsAsync.readFile(
      resolve(path, "this/is/nested.txt"),
      "utf-8",
    );
    expect(nestedFileContent).toBe("This is a file");
  });

  it("should create files using primitive types", async () => {
    const path = "./.vitest-testdirs/primitive-types";
    cleanup(path);

    const files = {
      "file1.txt": "Hello, world!",
      "file2.txt": 123,
      "file3.txt": true,
      "file4.txt": null,
      "file5.txt": undefined,
      "file6.txt": new Uint8Array([
        118,
        105,
        116,
        101,
        115,
        116,
        45,
        116,
        101,
        115,
        116,
        100,
        105,
        114,
        115,
      ]),
    };

    await createFileTree(path, files);

    for (const [filename, content] of Object.entries(files)) {
      const fileContent = await fsAsync.readFile(resolve(path, filename), "utf-8");
      if (content instanceof Uint8Array) {
        expect(fileContent).toBe("vitest-testdirs");
      } else {
        expect(fileContent).toBe(String(content));
      }
    }
  });

  it("should be able to create symlinks", async () => {
    const path = "./.vitest-testdirs/with-links";
    cleanup(path);

    const files = {
      "file1.txt": "Hello, world!",
      "dir1": {
        "file2.txt": "This is file 2",
        "text.txt": "This is a text file",
        "dir2": {
          "file3.txt": "This is file 3",
        },
      },
      "link1.txt": symlink("dir1/text.txt"),
      "link2.txt": link("dir1/file2.txt"),
    };

    await createFileTree(path, files);
    const file1Content = await fsAsync.readFile(resolve(path, "file1.txt"), "utf-8");
    expect(file1Content).toBe("Hello, world!");

    const file2Content = await fsAsync.readFile(
      resolve(path, "dir1/file2.txt"),
      "utf-8",
    );

    expect(file2Content).toBe("This is file 2");

    const file3Content = await fsAsync.readFile(
      resolve(path, "dir1/dir2/file3.txt"),
      "utf-8",
    );

    expect(file3Content).toBe("This is file 3");

    const link2Content = await fsAsync.readFile(resolve(path, "link2.txt"), "utf-8");

    expect(link2Content).toBe("This is file 2");
  });

  it.runIf(platform() !== "win32")("should be able to create files with different permissions", async () => {
    const path = "./.vitest-testdirs/with-permissions";
    cleanup(path);

    const files = {
      "file1.txt": metadata("Hello, world!", { mode: 0o644 }),
      "dir1": {
        "file2.txt": metadata("This is file 2", { mode: 0o444 }),
        "dir2": metadata({
          "file3.txt": "This is file 3",
        }, { mode: 0o555 }),
      },
    };

    await expect(createFileTree(path, files)).rejects.toThrowError("EACCES: permission denied");

    const file1Content = await fsAsync.readFile(resolve(path, "file1.txt"), "utf-8");
    expect(file1Content).toBe("Hello, world!");

    const file1Stats = await fsAsync.stat(resolve(path, "file1.txt"));
    expect((file1Stats.mode & 0o644).toString(8)).toBe("644");

    const file2Content = await fsAsync.readFile(
      resolve(path, "dir1/file2.txt"),
      "utf-8",
    );
    expect(file2Content).toBe("This is file 2");

    const file2Stats = await fsAsync.stat(resolve(path, "dir1/file2.txt"));
    expect((file2Stats.mode & 0o444).toString(8)).toBe("444");

    const dir2Stats = await fsAsync.stat(resolve(path, "dir1/dir2"));
    expect((dir2Stats.mode & 0o555).toString(8)).toBe("555");

    // because the dir has a non writable permission, it should throw an error
    // because we can't create the file inside the dir
    await expect(fsAsync.readFile(
      resolve(path, "dir1/dir2/file3.txt"),
      "utf-8",
    )).rejects.toThrowError("ENOENT: no such file or directory");

    await expect(fsAsync.writeFile(resolve(path, "dir1/dir2/file3.txt"), "Hello, world!")).rejects.toThrowError("EACCES: permission denied");
  });
});

describe("createFileTreeSync", () => {
  it("should create a file tree at the specified path", () => {
    const path = "./.vitest-testdirs/specified-path-sync";
    cleanup(path);

    const files = {
      "file1.txt": "Hello, world!",
      "this/is/nested.txt": "This is a file",
      "dir1": {
        "file2.txt": "This is file 2",
        "dir2": {
          "file3.txt": "This is file 3",
        },
      },
    };

    createFileTreeSync(path, files);

    const file1Content = fs.readFileSync(resolve(path, "file1.txt"), "utf-8");
    expect(file1Content).toBe("Hello, world!");

    const file2Content = fs.readFileSync(resolve(path, "dir1/file2.txt"), "utf-8");
    expect(file2Content).toBe("This is file 2");

    const file3Content = fs.readFileSync(
      resolve(path, "dir1/dir2/file3.txt"),
      "utf-8",
    );
    expect(file3Content).toBe("This is file 3");

    const nestedFile = fs.readdirSync(resolve(path, "this/is"));
    expect(nestedFile).toEqual(["nested.txt"]);

    const nestedFileContent = fs.readFileSync(
      resolve(path, "this/is/nested.txt"),
      "utf-8",
    );
    expect(nestedFileContent).toBe("This is a file");
  });

  it("should create files using primitive types", () => {
    const path = "./.vitest-testdirs/primitive-types-sync";
    cleanup(path);

    const files = {
      "file1.txt": "Hello, world!",
      "file2.txt": 123,
      "file3.txt": true,
      "file4.txt": null,
      "file5.txt": undefined,
      "file6.txt": new Uint8Array([
        118,
        105,
        116,
        101,
        115,
        116,
        45,
        116,
        101,
        115,
        116,
        100,
        105,
        114,
        115,
      ]),
    };

    createFileTreeSync(path, files);

    for (const [filename, content] of Object.entries(files)) {
      const fileContent = fs.readFileSync(resolve(path, filename), "utf-8");
      if (content instanceof Uint8Array) {
        expect(fileContent).toBe("vitest-testdirs");
      } else {
        expect(fileContent).toBe(String(content));
      }
    }
  });

  it("should be able to create symlinks", () => {
    const path = "./.vitest-testdirs/with-links-sync";
    cleanup(path);

    const files = {
      "file1.txt": "Hello, world!",
      "dir1": {
        "file2.txt": "This is file 2",
        "text.txt": "This is a text file",
        "dir2": {
          "file3.txt": "This is file 3",
        },
      },
      "link1.txt": symlink("dir1/text.txt"),
      "link2.txt": link("dir1/file2.txt"),
    };

    createFileTreeSync(path, files);
    const file1Content = fs.readFileSync(resolve(path, "file1.txt"), "utf-8");
    expect(file1Content).toBe("Hello, world!");

    const file2Content = fs.readFileSync(resolve(path, "dir1/file2.txt"), "utf-8");

    expect(file2Content).toBe("This is file 2");

    const file3Content = fs.readFileSync(
      resolve(path, "dir1/dir2/file3.txt"),
      "utf-8",
    );

    expect(file3Content).toBe("This is file 3");

    const link2Content = fs.readFileSync(resolve(path, "link2.txt"), "utf-8");

    expect(link2Content).toBe("This is file 2");
  });

  it.runIf(platform() !== "win32")("should be able to create files with different permissions", () => {
    const path = "./.vitest-testdirs/with-permissions-sync";
    cleanup(path);

    const files = {
      "file1.txt": metadata("Hello, world!", { mode: 0o644 }),
      "dir1": {
        "file2.txt": metadata("This is file 2", { mode: 0o444 }),
        "dir2": metadata({
          "file3.txt": "This is file 3",
        }, { mode: 0o555 }),
      },
    };

    expect(() => createFileTreeSync(path, files)).toThrowError("EACCES: permission denied");

    const file1Content = fs.readFileSync(resolve(path, "file1.txt"), "utf-8");
    expect(file1Content).toBe("Hello, world!");

    const file1Stats = fs.statSync(resolve(path, "file1.txt"));
    expect((file1Stats.mode & 0o644).toString(8)).toBe("644");

    const file2Content = fs.readFileSync(
      resolve(path, "dir1/file2.txt"),
      "utf-8",
    );
    expect(file2Content).toBe("This is file 2");

    const file2Stats = fs.statSync(resolve(path, "dir1/file2.txt"));
    expect((file2Stats.mode & 0o444).toString(8)).toBe("444");

    const dir2Stats = fs.statSync(resolve(path, "dir1/dir2"));
    expect((dir2Stats.mode & 0o555).toString(8)).toBe("555");

    // because the dir has a non writable permission, it should throw an error
    // because we can't create the file inside the dir
    expect(() => fs.readFileSync(
      resolve(path, "dir1/dir2/file3.txt"),
      "utf-8",
    )).toThrowError("ENOENT: no such file or directory");

    expect(() => fs.writeFileSync(resolve(path, "dir1/dir2/file3.txt"), "Hello, world!")).toThrowError("EACCES: permission denied");
  });
});

describe("create mapping of fs contents", () => {
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

      const rootReadme = await fsAsync.readFile("./README.md", "utf8");
      const testdirReadme = await fsAsync.readFile(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

      expect(rootReadme).toStrictEqual(testdirReadme);
    });

    it("should handle symbolic links using testdir (sync)", () => {
      const files = fromFileSystemSync("./test/fixtures/symlinks");

      const path = testdirSync(files);

      const rootReadme = fs.readFileSync("./README.md", "utf8");
      const testdirReadme = fs.readFileSync(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

      expect(rootReadme).toStrictEqual(testdirReadme);
    });

    it("should handle symbolic links using testdir with custom path", async () => {
      const files = await fromFileSystem("./test/fixtures/symlinks");

      const path = await testdir(files, {
        dirname: "./three/levels/deep",
      });

      const rootReadme = await fsAsync.readFile("./README.md", "utf8");
      const testdirReadme = await fsAsync.readFile(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

      expect(rootReadme).toStrictEqual(testdirReadme);
    });

    it("should handle symbolic links using testdir with custom path (sync)", () => {
      const files = fromFileSystemSync("./test/fixtures/symlinks");

      const path = testdirSync(files, {
        dirname: "./three/levels/deep-sync",
      });

      const rootReadme = fs.readFileSync("./README.md", "utf8");
      const testdirReadme = fs.readFileSync(`${path}/nested/double-nested/double-double-nested/README.md`, "utf8");

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
});
