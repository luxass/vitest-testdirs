import { normalize } from "node:path";
import { describe, expect, it, type RunnerTask, type SuiteCollector, vi } from "vitest";
import { getCurrentSuite, getCurrentTest } from "vitest/suite";
import { FIXTURE_METADATA, FIXTURE_TYPE_LINK_SYMBOL, FIXTURE_TYPE_SYMLINK_SYMBOL } from "../src/constants";
import { createDirnameFromTask, hasMetadata, isLink, isSymlink, link, metadata, symlink } from "../src/utils";

vi.mock("node:crypto", () => ({
  randomBytes: vi.fn().mockReturnValue({
    toString: () => "abc123",
  }),
}));

function createSuiteCollectorMock(name?: string) {
  return {
    type: "collector",
    name,
  } as SuiteCollector;
}

type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

function createTestMock(name: string, extra: DeepPartial<RunnerTask> = {}) {
  return {
    type: "test",
    name,
    ...extra,
  } as RunnerTask;
}

describe("createDirnameFromTask", () => {
  it("should create dirname for collector type", () => {
    const collector = createSuiteCollectorMock("test suite");
    expect(createDirnameFromTask(collector)).toBe("vitest-abc123-test-suite");
  });

  it("should use \"unnamed suite\" for collector without name", () => {
    const collector = createSuiteCollectorMock();
    expect(createDirnameFromTask(collector)).toBe("vitest-abc123-unnamed-suite");
  });

  it("should create dirname for test without suite", () => {
    const test = createTestMock("test case", {
      file: {
        name: "/path/to/file.test.ts",
      },
    });
    expect(createDirnameFromTask(test)).toBe("vitest-file-test-case");
  });

  it("should create dirname for test with suite", () => {
    const test = createTestMock("test case", {
      file: {
        name: "/path/to/file.test.ts",
      },
      suite: {
        name: "test suite",
      },
    });
    expect(createDirnameFromTask(test)).toBe("vitest-file-test-suite-test-case");
  });

  it("should handle missing file name", () => {
    const test = createTestMock("test case");
    expect(createDirnameFromTask(test)).toBe("vitest-unnamed-test-case");
  });

  it("should handle missing test name", () => {
    const test = createTestMock("", {
      file: {
        name: "/path/to/file.test.ts",
      },
    });
    expect(createDirnameFromTask(test)).toBe("vitest-file-unnamed-test");
  });

  it("should work with vitest/suite helpers", () => {
    expect(createDirnameFromTask(getCurrentTest() || getCurrentSuite())).toBe("vitest-utils-createDirnameFromTask-should-work-with-vitest-suite-helpers");
  });

  it("should remove '.test.ts' from the file name", () => {
    const task = createTestMock("should remove '.test.ts' from the file name", {
      file: { name: "utils.test.ts" },
    });
    expect(createDirnameFromTask(task)).toBe("vitest-utils-should-remove-test-ts-from-the-file-name");
  });

  it("should replace non-alphanumeric characters with '-'", () => {
    const task = createTestMock("should replace ........ æøå non-alphanumeric characters with '-'", {
      file: { name: "utils.test.ts" },
    });
    expect(createDirnameFromTask(task)).toBe("vitest-utils-should-replace-non-alphanumeric-characters-with");
  });

  it("should replace trailing hyphens with nothing", () => {
    const task = createTestMock("should replace trailing hyphens with nothing-", {
      file: { name: "utils.test.ts" },
    });
    expect(createDirnameFromTask(task)).toBe("vitest-utils-should-replace-trailing-hyphens-with-nothing");
  });

  it("should replace multiple hyphens with a single hyphen", () => {
    const task = createTestMock("should replace multiple---hyphens with a single hyphen---", {
      file: { name: "utils.test.ts" },
    });
    expect(createDirnameFromTask(task)).toBe("vitest-utils-should-replace-multiple-hyphens-with-a-single-hyphen");
  });
});

describe("helpers", () => {
  describe("symlinks", () => {
    it("should create symlinks", () => {
      const path = "/test/path";
      const result = symlink(path);
      expect(result).toEqual({
        [FIXTURE_TYPE_SYMLINK_SYMBOL]: FIXTURE_TYPE_SYMLINK_SYMBOL,
        path: normalize(path),
      });
    });

    it("should create symlinks with relative paths", () => {
      const path = "../test/path";
      const result = symlink(path);
      expect(result).toEqual({
        [FIXTURE_TYPE_SYMLINK_SYMBOL]: FIXTURE_TYPE_SYMLINK_SYMBOL,
        path: normalize(path),
      });
    });

    it("should create symlinks with empty paths", () => {
      const path = "";
      const result = symlink(path);

      expect(result).toEqual({
        [FIXTURE_TYPE_SYMLINK_SYMBOL]: FIXTURE_TYPE_SYMLINK_SYMBOL,
        path: normalize(path),
      });
    });

    describe("detect symlinks", () => {
      it("should detect symlinks", () => {
        const symlinkFixture = symlink("/test/path");
        expect(isSymlink(symlinkFixture)).toBe(true);
      });

      it("should detect links", () => {
        const linkFixture = link("/test/path");
        expect(isSymlink(linkFixture)).toBe(false);
      });

      it("should not detect other objects", () => {
        expect(isSymlink({})).toBe(false);
        expect(isSymlink(null)).toBe(false);
        expect(isSymlink(undefined)).toBe(false);
        expect(isSymlink("")).toBe(false);
        expect(isSymlink(123)).toBe(false);
        expect(isSymlink([])).toBe(false);
      });
    });
  });

  describe("links", () => {
    it("should create links", () => {
      const path = "/test/path";
      const result = link(path);
      expect(result).toEqual({
        [FIXTURE_TYPE_LINK_SYMBOL]: FIXTURE_TYPE_LINK_SYMBOL,
        path: normalize(path),
      });
    });

    it("should create links with relative paths", () => {
      const path = "../test/path";
      const result = link(path);
      expect(result).toEqual({
        [FIXTURE_TYPE_LINK_SYMBOL]: FIXTURE_TYPE_LINK_SYMBOL,
        path: normalize(path),
      });
    });

    it("should create links with empty paths", () => {
      const path = "";
      const result = link(path);

      expect(result).toEqual({
        [FIXTURE_TYPE_LINK_SYMBOL]: FIXTURE_TYPE_LINK_SYMBOL,
        path: normalize(path),
      });
    });

    describe("detect links", () => {
      it("should detect links", () => {
        const linkFixture = link("/test/path");
        expect(isLink(linkFixture)).toBe(true);
      });

      it("should detect symlinks", () => {
        const symlinkFixture = symlink("/test/path");
        expect(isLink(symlinkFixture)).toBe(false);
      });

      it("should not detect other objects", () => {
        expect(isLink({})).toBe(false);
        expect(isLink(null)).toBe(false);
        expect(isLink(undefined)).toBe(false);
        expect(isLink("")).toBe(false);
        expect(isLink(123)).toBe(false);
        expect(isLink([])).toBe(false);
      });
    });
  });

  describe("metadata", () => {
    it("should combine content with metadata", () => {
      const content = "some content";
      const fsMetadata = { mode: 0o777 };
      const result = metadata(content, fsMetadata);
      expect(result).toEqual({
        [FIXTURE_METADATA]: fsMetadata,
        content,
      });
    });

    it("should work with directory JSON content", () => {
      const content = { "file.txt": "content" };
      const fsMetadata = { mode: 0o444 };
      const result = metadata(content, fsMetadata);
      expect(result).toEqual({
        [FIXTURE_METADATA]: fsMetadata,
        content,
      });
    });

    it("should preserve metadata object properties", () => {
      const content = "test";
      const fsMetadata = {
        mode: 0o755,
      };

      const result = metadata(content, fsMetadata);
      expect(result).toEqual({
        [FIXTURE_METADATA]: fsMetadata,
        content,
      });
    });

    it("should work with empty content", () => {
      const content = {};
      const fsMetadata = { mode: 0o777 };
      const result = metadata(content, fsMetadata);
      expect(result).toEqual({
        [FIXTURE_METADATA]: fsMetadata,
        content,
      });
    });

    it("should work with empty metadata", () => {
      const content = "some content";
      const fsMetadata = {};
      const result = metadata(content, fsMetadata);
      expect(result).toEqual({
        [FIXTURE_METADATA]: fsMetadata,
        content,
      });
    });

    describe("detect metadata", () => {
      it("should detect metadata", () => {
        const metadataFixture = metadata("content", { mode: 0o777 });
        expect(hasMetadata(metadataFixture)).toBe(true);
      });

      it("should not detect other objects", () => {
        expect(hasMetadata({})).toBe(false);
        expect(hasMetadata(null)).toBe(false);
        expect(hasMetadata(undefined)).toBe(false);
        expect(hasMetadata("")).toBe(false);
        expect(hasMetadata(123)).toBe(false);
        expect(hasMetadata([])).toBe(false);
      });
    });
  });
});
