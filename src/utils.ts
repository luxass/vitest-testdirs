import type { RunnerTask, RunnerTestCase, SuiteCollector, Task } from "vitest";
import type {
  DirectoryContent,
  DirectoryJSON,
  FSMetadata,
  TestdirLink,
  TestdirMetadata,
  TestdirSymlink,
} from "./types";
import { randomBytes } from "node:crypto";
import { statSync } from "node:fs";
import { stat } from "node:fs/promises";
import { normalize } from "node:path";
import {
  DIR_REGEX,
  FIXTURE_METADATA,
  FIXTURE_TYPE_LINK_SYMBOL,
  FIXTURE_TYPE_SYMLINK_SYMBOL,
} from "./constants";

/**
 * Create a symlink to a file or directory
 * @param {string} path The path to link to
 * @returns {TestdirSymlink} A TestdirSymlink object
 */
export function symlink(path: string): TestdirSymlink {
  return {
    [FIXTURE_TYPE_SYMLINK_SYMBOL]: FIXTURE_TYPE_SYMLINK_SYMBOL,
    path: normalize(path),
  };
}

/**
 * Create a link to a file or directory
 * @param {string} path The path to link to
 * @returns {TestdirLink} A TestdirLink object
 */
export function link(path: string): TestdirLink {
  return {
    [FIXTURE_TYPE_LINK_SYMBOL]: FIXTURE_TYPE_LINK_SYMBOL,
    path: normalize(path),
  };
}

/**
 * Combines directory JSON with metadata to create a TestdirMetadata object.
 *
 * @param {DirectoryContent} content - The content you want to add metadata to
 * @param {FSMetadata} metadata - The FSMetadata object containing file system metadata
 * @returns {TestdirMetadata} A TestdirMetadata object containing both the directory structure and metadata
 *
 * @remarks
 * due to how permissions work on windows and `libuv` doesn't support windows acl's.
 * setting a directory to readonly on windows doesn't actually work, and will still be writable.
 */
export function metadata(content: DirectoryContent | DirectoryJSON, metadata: FSMetadata): TestdirMetadata {
  return {
    [FIXTURE_METADATA]: metadata,
    content,
  };
}

/**
 * Check if value is a TestdirSymlink
 * @param {unknown} value The value to check
 * @returns {value is TestdirSymlink} The same value
 */
export function isSymlink(value: unknown): value is TestdirSymlink {
  return (
    typeof value === "object"
    && value !== null
    && (value as TestdirSymlink)[FIXTURE_TYPE_SYMLINK_SYMBOL]
    === FIXTURE_TYPE_SYMLINK_SYMBOL
  );
}

/**
 * Check if value is a TestdirLink
 * @param {unknown} value The value to check
 * @returns {value is TestdirLink} The same value
 */
export function isLink(value: unknown): value is TestdirLink {
  return (
    typeof value === "object"
    && value !== null
    && (value as TestdirLink)[FIXTURE_TYPE_LINK_SYMBOL]
    === FIXTURE_TYPE_LINK_SYMBOL
  );
}

/**
 * Check if value is a TestdirMetadata
 * @param {unknown} value The value to check
 * @returns {value is TestdirMetadata} The same value
 */
export function hasMetadata(value: unknown): value is TestdirMetadata {
  return (
    typeof value === "object"
    && value !== null
    && (value as TestdirMetadata)[FIXTURE_METADATA] != null
  );
}

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
