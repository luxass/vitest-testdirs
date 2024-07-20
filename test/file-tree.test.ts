import { readFileSync, readdirSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fs } from "memfs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFileTree, createFileTreeSync } from "../src/file-tree";
import { link, symlink } from "../src/utils";

vi.mock("node:fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");

  return memfs.fs.promises;
});

vi.mock("node:fs", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");

  return memfs.fs;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("createFileTree", () => {
  it("should create a file tree at the specified path", async () => {
    const path = "./test";
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

    const fsMkdirSpy = vi.spyOn(fs.promises, "mkdir");
    const fsWriteFile = vi.spyOn(fs.promises, "writeFile");

    await createFileTree(path, files);
    const file1Content = await readFile(resolve(path, "file1.txt"), "utf-8");
    expect(file1Content).toBe("Hello, world!");

    const file2Content = await readFile(
      resolve(path, "dir1/file2.txt"),
      "utf-8",
    );
    expect(file2Content).toBe("This is file 2");

    const file3Content = await readFile(
      resolve(path, "dir1/dir2/file3.txt"),
      "utf-8",
    );
    expect(file3Content).toBe("This is file 3");

    const nestedFile = await readdir(resolve(path, "this/is"));
    expect(nestedFile).toEqual(["nested.txt"]);

    const nestedFileContent = await readFile(
      resolve(path, "this/is/nested.txt"),
      "utf-8",
    );
    expect(nestedFileContent).toBe("This is a file");

    // its called six times, because it allows us to do
    // 'this/is/nested.txt' and it will create the directories
    expect(fsMkdirSpy).toHaveBeenCalledTimes(6);
    expect(fsWriteFile).toHaveBeenCalledTimes(4);
  });

  it("should create files using primitive types", async () => {
    const path = "./test";

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
      const fileContent = await readFile(resolve(path, filename), "utf-8");
      if (content instanceof Uint8Array) {
        expect(fileContent).toBe("vitest-testdirs");
      } else {
        expect(fileContent).toBe(String(content));
      }
    }
  });

  it("should be able to create symlinks", async () => {
    const path = "./test";
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

    const fsMkdirSpy = vi.spyOn(fs.promises, "mkdir");
    const fsWriteFileSpy = vi.spyOn(fs.promises, "writeFile");
    const fsLinkSpy = vi.spyOn(fs.promises, "link");

    await createFileTree(path, files);
    const file1Content = await readFile(resolve(path, "file1.txt"), "utf-8");
    expect(file1Content).toBe("Hello, world!");

    const file2Content = await readFile(
      resolve(path, "dir1/file2.txt"),
      "utf-8",
    );

    expect(file2Content).toBe("This is file 2");

    const file3Content = await readFile(
      resolve(path, "dir1/dir2/file3.txt"),
      "utf-8",
    );

    expect(file3Content).toBe("This is file 3");

    const link2Content = await readFile(resolve(path, "link2.txt"), "utf-8");

    expect(link2Content).toBe("This is file 2");

    expect(fsMkdirSpy).toHaveBeenCalledTimes(6);
    expect(fsWriteFileSpy).toHaveBeenCalledTimes(4);
    expect(fsLinkSpy).toHaveBeenCalledTimes(1);
  });
});

describe("createFileTreeSync", () => {
  it("should create a file tree at the specified path", () => {
    const path = "./test";
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

    const fsMkdirSpy = vi.spyOn(fs, "mkdirSync");
    const fsWriteFile = vi.spyOn(fs, "writeFileSync");

    createFileTreeSync(path, files);

    const file1Content = readFileSync(resolve(path, "file1.txt"), "utf-8");
    expect(file1Content).toBe("Hello, world!");

    const file2Content = readFileSync(resolve(path, "dir1/file2.txt"), "utf-8");
    expect(file2Content).toBe("This is file 2");

    const file3Content = readFileSync(
      resolve(path, "dir1/dir2/file3.txt"),
      "utf-8",
    );
    expect(file3Content).toBe("This is file 3");

    const nestedFile = readdirSync(resolve(path, "this/is"));
    expect(nestedFile).toEqual(["nested.txt"]);

    const nestedFileContent = readFileSync(
      resolve(path, "this/is/nested.txt"),
      "utf-8",
    );
    expect(nestedFileContent).toBe("This is a file");

    // its called six times, because it allows us to do
    // 'this/is/nested.txt' and it will create the directories
    expect(fsMkdirSpy).toHaveBeenCalledTimes(6);
    expect(fsWriteFile).toHaveBeenCalledTimes(4);
  });

  it("should create files using primitive types", () => {
    const path = "./test";

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
      const fileContent = readFileSync(resolve(path, filename), "utf-8");
      if (content instanceof Uint8Array) {
        expect(fileContent).toBe("vitest-testdirs");
      } else {
        expect(fileContent).toBe(String(content));
      }
    }
  });

  it("should be able to create symlinks", () => {
    const path = "./test";
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

    const fsMkdirSpy = vi.spyOn(fs, "mkdirSync");
    const fsWriteFileSpy = vi.spyOn(fs, "writeFileSync");
    const fsLinkSpy = vi.spyOn(fs, "linkSync");

    createFileTreeSync(path, files);
    const file1Content = readFileSync(resolve(path, "file1.txt"), "utf-8");
    expect(file1Content).toBe("Hello, world!");

    const file2Content = readFileSync(
      resolve(path, "dir1/file2.txt"),
      "utf-8",
    );

    expect(file2Content).toBe("This is file 2");

    const file3Content = readFileSync(
      resolve(path, "dir1/dir2/file3.txt"),
      "utf-8",
    );

    expect(file3Content).toBe("This is file 3");

    const link2Content = readFileSync(resolve(path, "link2.txt"), "utf-8");

    expect(link2Content).toBe("This is file 2");

    expect(fsMkdirSpy).toHaveBeenCalledTimes(6);
    expect(fsWriteFileSpy).toHaveBeenCalledTimes(4);
    expect(fsLinkSpy).toHaveBeenCalledTimes(1);
  });
});
