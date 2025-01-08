import { describe, expect, it, type RunnerTask, type SuiteCollector } from "vitest";
import { getCurrentSuite, getCurrentTest } from "vitest/suite";
import { createDirnameFromTask } from "../src/utils";

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
    expect(createDirnameFromTask(collector)).toBe("vitest-utils-test-suite");
  });

  it("should use \"unnamed suite\" for collector without name", () => {
    const collector = createSuiteCollectorMock();
    expect(createDirnameFromTask(collector)).toBe("vitest-utils-unnamed-suite");
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
