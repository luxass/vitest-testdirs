/**
 * This module contains utility functions for creating test directories.
 * @module utils
 *
 *  @example
 * ```ts
 * import { testdir, link, symlink } from "vitest-testdirs/utils";
 *
 * const dir = await testdir({
 *   nested: {
 *     "file.txt": "Hello, World!",
 *     "link.txt": link("../file.txt"),
 *     "symlink.txt": symlink("../file.txt"),
 *   },
 *   "file.txt": "Hello, World!",
 * });
 *
 * console.log(dir);
 * ```
 */

import type { DirectoryJSON, TestdirLink, TestdirSymlink } from "./types";
import { rmSync } from "node:fs";
import { rm } from "node:fs/promises";
import { normalize } from "node:path";
import { onTestFinished, type Task } from "vitest";
import { getCurrentTest } from "vitest/suite";
import {
  FIXTURE_TYPE_LINK_SYMBOL,
  FIXTURE_TYPE_SYMLINK_SYMBOL,
} from "./constants";
import { createFileTree, createFileTreeSync } from "./file-tree";

/**
 * The base directory for test directories.
 */
export const BASE_DIR = ".vitest-testdirs";

/**
 * Options for creating a test directory.
 */
export interface TestdirOptions {
  /**
   * Whether to cleanup the directory after the test has finished.
   * @default true
   */
  cleanup?: boolean;

  /**
   * The directory name to use.
   *
   * If not provided, a directory name will be generated based on the test name.
   */
  dirname?: string;

  /**
   * Whether to allow the directory to be created outside of the `.vitest-testdirs` directory.
   *
   * WARN:
   * This can be dangerous as it can delete files, folders, etc. where it shouldn't.
   * Use with caution.
   *
   * @default false
   */
  allowOutside?: boolean;
}

/**
 * Creates a test directory with the specified files and options.
 *
 * @param {DirectoryJSON} files - The directory structure to create.
 * @param {TestdirOptions?} options - The options for creating the test directory.
 * @returns {Promise<string>} The path of the created test directory.
 * @throws An error if `testdir` is called outside of a test.
 */
export async function testdir(
  files: DirectoryJSON,
  options?: TestdirOptions,
): Promise<string> {
  if (!getCurrentTest()) {
    throw new Error("testdir must be called inside a test");
  }
  const dirname = options?.dirname
    ? normalize(`${BASE_DIR}/${options.dirname}`)
    : normalize(`${BASE_DIR}/${getDirNameFromTask(getCurrentTest()!)}`);

  const allowOutside = options?.allowOutside ?? false;

  // if the dirname is escaped from BASE_DIR, throw an error
  if (!allowOutside && !dirname.startsWith(BASE_DIR)) {
    throw new Error(`The directory name must start with '${BASE_DIR}'`);
  }

  await createFileTree(dirname, files!);

  if (options?.cleanup ?? true) {
    onTestFinished(async () => {
      await rm(dirname, {
        recursive: true,
      });
    });
  }

  return dirname;
}

/**
 * Cleans up the test directory after the test has finished.
 * @param {DirectoryJSON} files - The directory structure to create.
 * @returns {Promise<string>} The path of the created test directory.
 *
 * @example
 * ```ts
 * const dir = testdir.cleanup({
 *  "file.txt": "Hello, World!",
 * });
 */
testdir.cleanup = async (files: DirectoryJSON): Promise<string> =>
  testdir(files, {
    cleanup: true,
  });

/**
 * Creates a test directory with the specified files and options.
 * @param {string} dirname - The directory name to use.
 * @returns {Function} A function that creates a test directory with the specified files.
 * @throws An error if `testdir` is called outside of a test.
 *
 * @example
 * ```ts
 * const dir = testdir.dir("my-dir")({
 *  "file.txt": "Hello, World!",
 * });
 * ```
 */
testdir.dir = (
  dirname: string,
): ((files: DirectoryJSON) => Promise<string>) => {
  return (files: DirectoryJSON) =>
    testdir(files, {
      dirname,
    });
};

/**
 * Creates a test directory with the specified files and options.
 *
 * @param {DirectoryJSON} files - The directory structure to create.
 * @param {TestdirOptions?} options - The options for creating the test directory.
 * @returns {string} The path of the created test directory.
 * @throws An error if `testdir` is called outside of a test.
 */
export function testdirSync(
  files: DirectoryJSON,
  options?: TestdirOptions,
): string {
  if (!getCurrentTest()) {
    throw new Error("testdir must be called inside a test");
  }
  const dirname = options?.dirname
    ? normalize(`${BASE_DIR}/${options.dirname}`)
    : normalize(`${BASE_DIR}/${getDirNameFromTask(getCurrentTest()!)}`);

  const allowOutside = options?.allowOutside ?? false;

  // if the dirname is escaped from BASE_DIR, throw an error
  if (!allowOutside && !dirname.startsWith(BASE_DIR)) {
    throw new Error(`The directory name must start with '${BASE_DIR}'`);
  }

  createFileTreeSync(dirname, files!);

  if (options?.cleanup ?? true) {
    onTestFinished(() => {
      rmSync(dirname, {
        recursive: true,
      });
    });
  }

  return dirname;
}

/**
 * Cleans up the test directory after the test has finished.
 * @param {DirectoryJSON} files - The directory structure to create.
 * @returns {string} The path of the created test directory.
 *
 * @example
 * ```ts
 * const dir = testdirSync.cleanup({
 *  "file.txt": "Hello, World!",
 * });
 * ```
 */
testdirSync.cleanup = (files: DirectoryJSON): string =>
  testdirSync(files, {
    cleanup: true,
  });

/**
 * Creates a test directory with the specified files and options.
 * @param {string} dirname - The directory name to use.
 * @returns {Function} A function that creates a test directory with the specified files.
 * @throws An error if `testdir` is called outside of a test.
 *
 * @example
 * ```ts
 * const dir = testdirSync.dir("my-dir")({
 *  "file.txt": "Hello, World!",
 * });
 * ```
 */
testdirSync.dir = (dirname: string): ((files: DirectoryJSON) => string) => {
  return (files: DirectoryJSON) =>
    testdirSync(files, {
      dirname,
    });
};

/**
 * Regular expression for replacing invalid characters in directory names.
 */
export const DIR_REGEX = /[^\w\-]+/g;

/**
 * Returns the directory name for a given task.
 *
 * @param {Task} task - The task object.
 * @returns {string} The directory name for the task.
 */
export function getDirNameFromTask(task: Task): string {
  const fileName = (task.file?.name || "unnamed")
    .split("/")
    .pop()!
    .replace(/\.test\.ts$/, "")
    .replace(DIR_REGEX, "-");
  const name = task.name || "unnamed test";

  let dirName: string;

  if (!task.suite) {
    dirName = `vitest-${fileName}-${name.replace(DIR_REGEX, "-")}`;
  } else {
    const suiteName = task.suite?.name;
    dirName = `vitest-${fileName}${suiteName ? `-${suiteName.replace(DIR_REGEX, "-")}-` : "-"}${name.replace(DIR_REGEX, "-")}`;
  }

  // trim trailing hyphen and multiple hyphens
  return dirName.replace(/-{2,}/g, "-").replace(/-+$/, "");
}

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
 * @param value The value to check
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
