import fs from "node:fs";
import fsAsync from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, onTestFailed, onTestFinished, vi } from "vitest";
import { createFileTree, createFileTreeSync } from "../src/file-tree";
import { link, symlink, withMetadata } from "../src/utils";

afterEach(() => {
  vi.clearAllMocks();
});

function cleanup(path: string) {
  onTestFinished(async () => {
    await fsAsync.rm(path, { recursive: true });
  });
}

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

  it("should be able to create files with different permissions", async () => {
    const path = "./.vitest-testdirs/with-permissions";
    cleanup(path);

    const files = {
      "file1.txt": withMetadata("Hello, world!", { mode: fs.constants.S_IRUSR | fs.constants.S_IWUSR | fs.constants.S_IRGRP | fs.constants.S_IROTH }),
      "dir1": {
        "file2.txt": withMetadata("This is file 2", { mode: fs.constants.S_IRUSR | fs.constants.S_IRGRP | fs.constants.S_IROTH }),
        "dir2": withMetadata({
          "file3.txt": "This is file 3",
        }, { mode: fs.constants.S_IRUSR | fs.constants.S_IXUSR | fs.constants.S_IRGRP | fs.constants.S_IXGRP | fs.constants.S_IROTH | fs.constants.S_IXOTH }),
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

  it("should be able to create files with different permissions", () => {
    const path = "./.vitest-testdirs/with-permissions-sync";
    // cleanup(path);

    const files = {
      "file1.txt": withMetadata("Hello, world!", { mode: fs.constants.S_IRUSR | fs.constants.S_IWUSR | fs.constants.S_IRGRP | fs.constants.S_IROTH }),
      "dir1": {
        "file2.txt": withMetadata("This is file 2", { mode: fs.constants.S_IRUSR | fs.constants.S_IRGRP | fs.constants.S_IROTH }),
        "dir2": withMetadata({
          "file3.txt": "This is file 3",
        }, { mode: fs.constants.S_IRUSR | fs.constants.S_IXUSR | fs.constants.S_IRGRP | fs.constants.S_IXGRP | fs.constants.S_IROTH | fs.constants.S_IXOTH }),
      },
    };

    onTestFailed(() => {
      const dirStats = fs.statSync(path);
      console.error(dirStats);

      const file1Stats = fs.statSync(resolve(path, "file1.txt"));
      console.error(file1Stats);

      const file2Stats = fs.statSync(resolve(path, "dir1/file2.txt"));
      console.error(file2Stats);

      const dir2Stats = fs.statSync(resolve(path, "dir1/dir2"));
      console.error(dir2Stats);

      const file3Stats = fs.statSync(resolve(path, "dir1/dir2/file3.txt"));
      console.error(file3Stats);
    });

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
