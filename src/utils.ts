import { readdirSync, readFileSync, readlinkSync, statSync } from "node:fs";
import { readdir, readFile, readlink, stat } from "node:fs/promises";
import { join, normalize } from "node:path";
import process from "node:process";
import { type DirectoryJSON, FIXTURE_ORIGINAL_PATH_SYMBOL, type FromFileSystemOptions } from "testdirs";
import { expect, type RunnerTask, type SuiteCollector } from "vitest";
import { getCurrentSuite, getCurrentTest } from "vitest/suite";
import {
  BASE_DIR,
} from "./constants";
import { symlink } from "./helpers";

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

/**
 * Processes a directory and its contents recursively, creating a JSON representation of the file system.
 *
 * @param {string} path - The absolute path to the directory to process
 * @param {Required<Omit<FromFileSystemOptions, "extras">>} options - Configuration options for processing the directory
 *
 * @returns {Promise<DirectoryJSON>} A Promise that resolves to a DirectoryJSON object representing the directory structure
 *          where keys are file/directory names and values are either:
 *          - A string containing file contents for regular files
 *          - A DirectoryJSON object for subdirectories
 *          - A symbolic link representation for symlinks (when followLinks is true)
 *
 * @throws {Error} If there are issues reading the directory or its contents
 */
export async function processDirectory(
  path: string,
  options: Required<Omit<FromFileSystemOptions, "extras">>,
): Promise<DirectoryJSON> {
  const files: DirectoryJSON = {
    [FIXTURE_ORIGINAL_PATH_SYMBOL]: normalize(path),
  };

  const dirFiles = await readdir(path, {
    withFileTypes: true,
  });

  const filteredFiles = dirFiles.filter((file) => !options.ignore.includes(file.name));

  for (const file of filteredFiles) {
    const filePath = file.name;
    const fullPath = `${path}/${filePath}`;

    if (file.isDirectory()) {
      files[filePath] = await processDirectory(fullPath, options);
    } else if (options.followLinks && file.isSymbolicLink()) {
      files[filePath] = symlink(await readlink(fullPath));
    } else {
      files[filePath] = await readFile(fullPath, options.getEncodingForFile(fullPath));
    }
  }

  return files;
}

/**
 * Recursively processes a directory and returns its structure as a JSON object.
 *
 * @param {string} path - The absolute path to the directory to process
 * @param {Required<Omit<FromFileSystemOptions, "extras">>} options - Configuration options for processing the directory
 *
 * @returns {DirectoryJSON} A DirectoryJSON object representing the directory structure where:
 * - Keys are file/directory names
 * - Values are either:
 *   - String content for files
 *   - Nested DirectoryJSON objects for directories
 *   - Symlink objects for symbolic links (when followLinks is true)
 * - Special key [FIXTURE_ORIGINAL_PATH] contains the normalized original path
 */
export function processDirectorySync(
  path: string,
  options: Required<Omit<FromFileSystemOptions, "extras">>,
): DirectoryJSON {
  const files: DirectoryJSON = {
    [FIXTURE_ORIGINAL_PATH_SYMBOL]: normalize(path),
  };

  const dirFiles = readdirSync(path, {
    withFileTypes: true,
  });

  const filteredFiles = dirFiles.filter((file) => !options.ignore.includes(file.name));

  for (const file of filteredFiles) {
    const filePath = file.name;
    const fullPath = `${path}/${filePath}`;

    if (file.isDirectory()) {
      files[filePath] = processDirectorySync(fullPath, options);
    } else if (options.followLinks && file.isSymbolicLink()) {
      files[filePath] = symlink(readlinkSync(fullPath));
    } else {
      files[filePath] = readFileSync(fullPath, options.getEncodingForFile(fullPath));
    }
  }

  return files;
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
