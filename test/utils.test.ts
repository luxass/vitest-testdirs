import fs from "node:fs";
import fsAsync from "node:fs/promises";
import { join, normalize } from "node:path";
import {
  describe,
  expect,
  it,
  onTestFinished,
  type Task,
} from "vitest";
import { getCurrentTest } from "vitest/suite";
import {
  FIXTURE_METADATA,
  FIXTURE_TYPE_LINK_SYMBOL,
  FIXTURE_TYPE_SYMLINK_SYMBOL,
} from "../src/constants";
import {
  getDirNameFromTask,
  isLink,
  isSymlink,
  link,
  symlink,
  testdir,
  testdirSync,
  withMetadata,
} from "../src/utils";

describe("getDirNameFromTask", () => {
  it("should return the correct directory name for a task using 'getCurrentTest'", () => {
    const dirName = getDirNameFromTask(getCurrentTest()!);

    expect(dirName).toBe(
      "vitest-utils-getDirNameFromTask-should-return-the-correct-directory-name-for-a-task-using-getCurrentTest",
    );
  });

  it("should use 'unnamed' as the file name if the task does not have a file name", () => {
    const task = {
      file: {},
      name: "should use 'unnamed' as the file name if the task does not have a file name",
      suite: { name: "utils" },
    } as Task;

    const dirName = getDirNameFromTask(task);

    expect(dirName).toBe(
      "vitest-unnamed-utils-should-use-unnamed-as-the-file-name-if-the-task-does-not-have-a-file-name",
    );
  });

  it("should include suite name in the directory name", () => {
    const task = {
      file: {},
      name: "should include suite name in the directory name",
      suite: { name: "utils" },
    } as Task;

    const dirName = getDirNameFromTask(task);

    expect(dirName).toBe(
      "vitest-unnamed-utils-should-include-suite-name-in-the-directory-name",
    );
  });

  it("should remove '.test.ts' from the file name", () => {
    const task = {
      file: { name: "utils.test.ts" },
      name: "should remove '.test.ts' from the file name",
    } as Task;

    const dirName = getDirNameFromTask(task);

    expect(dirName).toBe(
      "vitest-utils-should-remove-test-ts-from-the-file-name",
    );
  });

  it("should replace non-alphanumeric characters with '-'", () => {
    const task = {
      file: { name: "utils.test.ts" },
      name: "should replace ........ æøå non-alphanumeric characters with '-'",
    } as Task;

    const dirName = getDirNameFromTask(task);

    expect(dirName).toBe(
      "vitest-utils-should-replace-non-alphanumeric-characters-with",
    );
  });

  it("should replace trailing hyphens with nothing", () => {
    const task = {
      file: { name: "utils.test.ts" },
      name: "should replace trailing hyphens with nothing-",
    } as Task;

    const dirName = getDirNameFromTask(task);

    expect(dirName).toBe(
      "vitest-utils-should-replace-trailing-hyphens-with-nothing",
    );
  });

  it("should replace multiple hyphens with a single hyphen", () => {
    const task = {
      file: { name: "utils.test.ts" },
      name: "should replace multiple---hyphens with a single hyphen---",
    } as Task;

    const dirName = getDirNameFromTask(task);

    expect(dirName).toBe(
      "vitest-utils-should-replace-multiple-hyphens-with-a-single-hyphen",
    );
  });
});

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
        ".vitest-testdirs/vitest-utils-testdir-should-generate-a-directory-name-based-on-the-test-name-if-dirname-is-not-provided",
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
      const dirname = getDirNameFromTask(getCurrentTest()!);
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
        ".vitest-testdirs/vitest-utils-testdirSync-should-generate-a-directory-name-based-on-the-test-name-if-dirname-is-not-provided",
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
      const dirname = getDirNameFromTask(getCurrentTest()!);
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

describe("isLink", () => {
  it("should return true if the value is a TestdirLink", () => {
    const value = {
      [FIXTURE_TYPE_LINK_SYMBOL]: FIXTURE_TYPE_LINK_SYMBOL,
      path: "path/to/file",
    };

    const result = isLink(value);

    expect(result).toBe(true);
  });

  it("should return false if the value is not a TestdirLink", () => {
    const value = {
      path: "path/to/file",
    };

    const result = isLink(value);

    expect(result).toBe(false);
  });

  it("should return false if the value is null", () => {
    const value = null;

    const result = isLink(value);

    expect(result).toBe(false);
  });

  it("should return false if the value is undefined", () => {
    const value = undefined;

    const result = isLink(value);

    expect(result).toBe(false);
  });

  it("should return false if the value is a string", () => {
    const value = "path/to/file";

    const result = isLink(value);

    expect(result).toBe(false);
  });

  it("should return false if the value is a number", () => {
    const value = 123;

    const result = isLink(value);

    expect(result).toBe(false);
  });

  it("should return false if the value is a boolean", () => {
    const value = true;

    const result = isLink(value);

    expect(result).toBe(false);
  });

  it("should return false if the value is an array", () => {
    const value = [1, 2, 3];

    const result = isLink(value);

    expect(result).toBe(false);
  });

  it("should return false if the value is an object without the link symbol", () => {
    const value = {
      path: "path/to/file",
    };

    const result = isLink(value);

    expect(result).toBe(false);
  });
});

describe("isSymlink", () => {
  it("should return true if the value is a TestdirSymlink", () => {
    const value = {
      [FIXTURE_TYPE_SYMLINK_SYMBOL]: FIXTURE_TYPE_SYMLINK_SYMBOL,
      path: "path/to/file",
    };

    const result = isSymlink(value);

    expect(result).toBe(true);
  });

  it("should return false if the value is not a TestdirSymlink", () => {
    const value = {
      path: "path/to/file",
    };

    const result = isSymlink(value);

    expect(result).toBe(false);
  });

  it("should return false if the value is null", () => {
    const value = null;

    const result = isSymlink(value);

    expect(result).toBe(false);
  });

  it("should return false if the value is undefined", () => {
    const value = undefined;

    const result = isSymlink(value);

    expect(result).toBe(false);
  });
});

it("should create a TestdirLink object with the provided path", () => {
  const path = "path/to/file";

  const result = link(path);

  expect(result).toEqual({
    [FIXTURE_TYPE_LINK_SYMBOL]: FIXTURE_TYPE_LINK_SYMBOL,
    path: normalize(path),
  });
});

it("should create a TestdirSymlink object with the specified path", () => {
  const path = "path/to/file";

  const result = symlink(path);

  expect(result).toEqual({
    [FIXTURE_TYPE_SYMLINK_SYMBOL]: FIXTURE_TYPE_SYMLINK_SYMBOL,
    path: normalize(path),
  });
});

it("should create a TestdirMetadata object with the content and mode", () => {
  const result = withMetadata("content", { mode: 0o400 });

  expect(result).toEqual({
    [FIXTURE_METADATA]: {
      mode: 0o400,
    },
    content: "content",
  });
});
