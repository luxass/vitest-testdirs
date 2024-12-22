import type { Dirent, Stats } from "node:fs";
import { fs, vol } from "memfs";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fromFileSystem, fromFileSystemSync } from "../src/file-system";
import { symlink } from "../src/utils";

vi.mock("node:fs", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");

  return memfs.fs;
});

vi.mock("node:fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");

  return memfs.fs.promises;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("fromFileSystem", () => {
  it("should return an empty object if the path does not exist", async () => {
    vi.spyOn(fs.promises, "stat").mockRejectedValueOnce(new Error("Path does not exist"));

    const result = await fromFileSystem("non-existent-path");

    expect(result).toEqual({});
  });

  it("should return an empty object if the path is not a directory", async () => {
    vi.spyOn(fs.promises, "stat").mockResolvedValueOnce({
      isDirectory: () => false,
    } as Stats);

    const result = await fromFileSystem("not-a-directory");

    expect(result).toEqual({});
  });

  it("should return the directory structure with file contents", async () => {
    const mockFiles = {
      "file1.txt": "content1",
      "file2.txt": "content2",
      "subdir": {
        "file3.txt": "content3",
      },
    };

    // @ts-expect-error - TODO: fix this
    vi.spyOn(fs.promises, "stat").mockImplementation(async (path: string) => {
      if (path === "test-dir" || path === "test-dir/subdir") {
        return {
          isDirectory: () => true,
          isFile: () => false,
          isSymbolicLink: () => false,
        } as Stats;
      }
      return {
        isDirectory: () => false,
        isFile: () => true,
        isSymbolicLink: () => false,
      } as Stats;
    });

    // @ts-expect-error - TODO: fix this
    vi.spyOn(fs.promises, "readdir").mockImplementation(async (path: string) => {
      if (path === "test-dir") {
        return [
          {
            name: "file1.txt",
            isDirectory: () => false,
            isFile: () => true,
            isSymbolicLink: () => false,
          },
          {
            name: "file2.txt",
            isDirectory: () => false,
            isFile: () => true,
            isSymbolicLink: () => false,
          },
          {
            name: "subdir",
            isDirectory: () => true,
            isFile: () => false,
            isSymbolicLink: () => false,
          },
        ] as Dirent[];
      }
      if (path === "test-dir/subdir") {
        return [
          {
            name: "file3.txt",
            isDirectory: () => false,
            isFile: () => true,
            isSymbolicLink: () => false,
          },
        ] as Dirent[];
      }
      return [];
    });

    // @ts-expect-error - TODO: fix this
    vi.spyOn(fs.promises, "readFile").mockImplementation(async (path: string) => {
      if (path === "test-dir/file1.txt") return "content1";
      if (path === "test-dir/file2.txt") return "content2";
      if (path === "test-dir/subdir/file3.txt") return "content3";
      return "";
    });

    const result = await fromFileSystem("test-dir");

    expect(result).toEqual(mockFiles);
  });
});

describe("fromFileSystemSync", () => {
  it("should return an empty object if the path does not exist", () => {
    vi.spyOn(fs, "statSync").mockImplementationOnce(() => {
      throw new Error("Path does not exist");
    });

    const result = fromFileSystemSync("non-existent-path");

    expect(result).toEqual({});
  });

  it("should return an empty object if the path is not a directory", () => {
    vi.spyOn(fs, "statSync").mockResolvedValueOnce({
      isDirectory: () => false,
      isFile: () => false,
      isSymbolicLink: () => false,
    } as any);

    const result = fromFileSystemSync("not-a-directory");

    expect(result).toEqual({});
  });

  it("should return the directory structure with file contents", () => {
    const mockFiles = {
      "file1.txt": "content1",
      "file2.txt": "content2",
      "subdir": {
        "file3.txt": "content3",
      },
    };
    // @ts-expect-error - TODO: fix this
    vi.spyOn(fs, "statSync").mockImplementation((path: string) => {
      if (path === "test-dir" || path === "test-dir/subdir") {
        return {
          isDirectory: () => true,
          isFile: () => false,
          isSymbolicLink: () => false,
        } as Stats;
      }
      return {
        isDirectory: () => false,
        isFile: () => true,
        isSymbolicLink: () => false,
      } as Stats;
    });

    // @ts-expect-error - TODO: fix this
    vi.spyOn(fs, "readdirSync").mockImplementation((path: string) => {
      if (path === "test-dir") {
        return [
          {
            name: "file1.txt",
            isDirectory: () => false,
            isFile: () => true,
            isSymbolicLink: () => false,
          },
          {
            name: "file2.txt",
            isDirectory: () => false,
            isFile: () => true,
            isSymbolicLink: () => false,
          },
          {
            name: "subdir",
            isDirectory: () => true,
            isFile: () => false,
            isSymbolicLink: () => false,
          },
        ] as Dirent[];
      }
      if (path === "test-dir/subdir") {
        return [
          {
            name: "file3.txt",
            isDirectory: () => false,
            isFile: () => true,
            isSymbolicLink: () => false,
          },
        ] as Dirent[];
      }
      return [];
    });

    // @ts-expect-error - TODO: fix this
    vi.spyOn(fs, "readFileSync").mockImplementation((path: string) => {
      if (path === "test-dir/file1.txt") return "content1";
      if (path === "test-dir/file2.txt") return "content2";
      if (path === "test-dir/subdir/file3.txt") return "content3";
      return "";
    });

    const result = fromFileSystemSync("test-dir");

    expect(result).toEqual(mockFiles);
  });
});
