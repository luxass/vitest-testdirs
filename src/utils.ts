import { join, normalize } from "node:path";
import process from "node:process";
import { expect, type RunnerTask, type SuiteCollector } from "vitest";
import { getCurrentSuite, getCurrentTest } from "vitest/suite";
import {
  BASE_DIR,
} from "./constants";

/**
 * Regular expression that matches any character that is not a word character or hyphen.
 * Used for validating and sanitizing directory names.
 * - Matches any character that is not [A-Za-z0-9_-]
 * - Global flag (g) enables matching all occurrences
 */
const DIR_REGEX = /[^\w\-]+/g;

/**
 * Checks if the code is currently running within a Vitest test environment.
 * This function uses Vitest's internal getCurrentTest and getCurrentSuite functions
 * to determine if execution is happening during a test run.
 *
 * @returns {boolean} True if code is running within a Vitest test, false otherwise
 */
export function isInVitest(): boolean {
  return getCurrentTest() != null || getCurrentSuite() != null;
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

    const fileName = (expect.getState().testPath || "unnamed")
      .replace(`${process.cwd()}/`, "")
      .split("/")
      .pop()!
      .replace(/\.test\.ts$/, "")
      .replace(DIR_REGEX, "-");

    const dirName = `vitest-${fileName}-${suiteName.replace(DIR_REGEX, "-")}`;

    // trim trailing hyphen and multiple hyphens
    return dirName.replace(/-{2,}/g, "-").replace(/-+$/, "");
  }

  const fileName = (suiteOrTest.file?.name || "unnamed")
    .split("/")
    .pop()!
    .replace(/\.test\.ts$/, "")
    .replace(DIR_REGEX, "-");
  const name = suiteOrTest.name || "unnamed test";

  let dirName: string;

  if (!suiteOrTest.suite) {
    dirName = `vitest-${fileName}-${name.replace(DIR_REGEX, "-")}`;
  } else {
    const suiteName = suiteOrTest.suite?.name;
    dirName = `vitest-${fileName}${suiteName ? `-${suiteName.replace(DIR_REGEX, "-")}-` : "-"}${name.replace(DIR_REGEX, "-")}`;
  }

  // trim trailing hyphen and multiple hyphens
  return dirName.replace(/-{2,}/g, "-").replace(/-+$/, "");
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
  const test = getCurrentTest();
  const suite = getCurrentSuite();

  if (dirname != null) {
    return normalize(join(BASE_DIR, dirname));
  }

  return normalize(join(BASE_DIR, createDirnameFromTask(
    (test?.type === "test" ? test : suite) || suite,
  )));
}
