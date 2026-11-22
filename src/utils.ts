import { join, normalize } from "node:path";
import process from "node:process";

import type { RunnerTask, SuiteCollector } from "vitest";
import { expect } from "vitest";

import { BASE_DIR } from "./constants";
import { getCurrentSuite, getCurrentTest } from "./vitest-compat";

/**
 * Regular expression that matches any character that is not a word character or hyphen.
 * Used for validating and sanitizing directory names.
 * - Matches any character that is not [A-Za-z0-9_-]
 * - Global flag (g) enables matching all occurrences
 */
const DIR_REGEX = /[^\w-]+/gu;
const TEST_FILE_REGEX = /\.test\.ts$/u;
const MULTI_HYPHEN_REGEX = /-{2,}/gu;
const TRAILING_HYPHEN_REGEX = /-+$/u;

/** Returns the test or suite that owns the fixture directory. */
export function getTestdirTask(): RunnerTask | SuiteCollector {
  const test = getCurrentTest();
  if (test?.type === "test") {
    return test;
  }

  const suite = getCurrentSuite();
  if (suite == null) {
    throw new Error("testdir must be called inside vitest context");
  }

  return suite;
}

/**
 * Creates a directory name based on a test case or suite collector.
 *
 * @param {RunnerTestCase | SuiteCollector} suiteOrTest - The test case or suite collector to generate a directory name from
 * @returns {string} A sanitized directory name string with the following format:
 * - For collectors: `vitest-[random]-[suite name]`
 * - For test files without suite: `vitest-[file name]-[test name]`
 * - For test files with suite: `vitest-[file name]-[suite name]-[test name]`
 */
export function createDirnameFromTask(suiteOrTest: RunnerTask | SuiteCollector): string {
  if (suiteOrTest.type === "collector") {
    const suiteName = suiteOrTest.name || "unnamed suite";

    const fileName = (expect.getState().testPath ?? "unnamed")
      .replace(`${process.cwd()}/`, "")
      .split("/")
      .pop()!
      .replace(TEST_FILE_REGEX, "")
      .replace(DIR_REGEX, "-");

    const dirName = `vitest-${fileName}-${suiteName.replace(DIR_REGEX, "-")}`;

    // trim trailing hyphen and multiple hyphens
    return dirName.replace(MULTI_HYPHEN_REGEX, "-").replace(TRAILING_HYPHEN_REGEX, "");
  }

  const fileName = (suiteOrTest.file?.name || "unnamed")
    .split("/")
    .pop()!
    .replace(TEST_FILE_REGEX, "")
    .replace(DIR_REGEX, "-");
  const name = suiteOrTest.name || "unnamed test";

  let dirName: string;

  if (suiteOrTest.suite == null) {
    dirName = `vitest-${fileName}-${name.replace(DIR_REGEX, "-")}`;
  } else {
    const suiteName = suiteOrTest.suite.name;
    dirName = `vitest-${fileName}${suiteName ? `-${suiteName.replace(DIR_REGEX, "-")}-` : "-"}${name.replace(DIR_REGEX, "-")}`;
  }

  // trim trailing hyphen and multiple hyphens
  return dirName.replace(MULTI_HYPHEN_REGEX, "-").replace(TRAILING_HYPHEN_REGEX, "");
}

/**
 * Generates a normalized directory path based on the provided dirname or the current test/suite context.
 * This function must be called within a Vitest context.
 *
 * @param {string?} dirname - Optional directory name to use as the base path
 * @returns {string} A normalized absolute path combining the base directory with either the provided dirname or a generated name from the current test/suite
 * @internal
 */
export function internalGenerateDirname(dirname?: string): string {
  const task = getTestdirTask();
  return normalize(join(BASE_DIR, dirname ?? createDirnameFromTask(task)));
}
