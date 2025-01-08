import type { RunnerTask, SuiteCollector } from "vitest";
import type {
  DirectoryContent,
  DirectoryJSON,
  TestdirLink,
  TestdirMetadata,
  TestdirSymlink,
} from "./types";
import { randomBytes } from "node:crypto";
import { statSync } from "node:fs";
import { stat } from "node:fs/promises";
import {
  DIR_REGEX,
} from "./constants";

/**
 * Checks if the given data is a primitive value.
 *
 * @param {unknown} data - The data to be checked.
 * @returns {data is Exclude<DirectoryContent, TestdirSymlink | TestdirLink | DirectoryJSON | TestdirMetadata>} `true` if the data is a primitive value, `false` otherwise.
 */
export function isPrimitive(data: unknown): data is Exclude<DirectoryContent, TestdirSymlink | TestdirLink | DirectoryJSON | TestdirMetadata> {
  return (
    typeof data === "string"
    || typeof data === "number"
    || typeof data === "boolean"
    || data === null
    || data === undefined
    || typeof data === "bigint"
    || typeof data === "symbol"
    || data instanceof Uint8Array
  );
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

    const dirName = `vitest-${randomBytes(4).toString("hex")}-${suiteName.replace(DIR_REGEX, "-")}`;

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
 * Checks if the provided path points to a directory.
 *
 * @param {string} path - The file system path to check
 * @returns {Promise<boolean>} A promise that resolves to true if the path is a directory, false otherwise
 * @throws Never - Catches and handles any filesystem errors by returning false
 *
 * @example
 * ```ts
 * const isDir = await isDirectory("/path/to/check");
 * if (isDir) {
 *   console.log("Path is a directory");
 * }
 * ```
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const result = await stat(path);
    return result.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Synchronously checks if the given path is a directory.
 *
 * @param {string} path - The file system path to check
 * @returns {boolean} `true` if the path is a directory, `false` if it's not or if there was an error accessing the path
 *
 * @example
 * ```ts
 * // Check if a path is a directory
 * const isDir = isDirectorySync('./some/path');
 * if (isDir) {
 *   // Handle directory case
 * }
 * ```
 */
export function isDirectorySync(path: string): boolean {
  try {
    const result = statSync(path);
    return result.isDirectory();
  } catch {
    return false;
  }
}
