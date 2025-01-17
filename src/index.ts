/**
 * Vitest Testdirs - A utility to create a temporary directory with files and directories for testing.
 * @module index
 *
 * @example
 * ```ts
 * import { testdir } from "vitest-testdirs";
 *
 * const dir = await testdir({
 *   nested: {
 *     "file.txt": "Hello, World!",
 *   },
 * });
 *
 * console.log(dir);
 * ```
 */

import type {
  DirectoryContent,
  DirectoryJSON,
  EncodingForFileFn,
  FromFileSystemOptions,
  FSMetadata,
  TestdirFn,
  TestdirFromOptions,
  TestdirLink,
  TestdirMetadata,
  TestdirResult,
  TestdirSymlink,
} from "testdirs";
import { createFileTree, fromFileSystem, testdir as originalTestdir } from "testdirs";
import { createFileTreeSync, fromFileSystemSync, testdirSync as originalTestdirSync } from "testdirs/sync";

import {
  afterAll,
  onTestFinished,
} from "vitest";
import {
  getCurrentSuite,
  getCurrentTest,
} from "vitest/suite";
import { BASE_DIR } from "./constants";
import { internalGenerateDirname, isInVitest } from "./utils";

export {
  createFileTree,
  createFileTreeSync,
  type DirectoryContent,
  type DirectoryJSON,
  type EncodingForFileFn,
  fromFileSystem,
  type FromFileSystemOptions,
  fromFileSystemSync,
  type FSMetadata,
  type TestdirFn,
  type TestdirFromOptions,
  type TestdirLink,
  type TestdirMetadata,
  type TestdirResult,
  type TestdirSymlink,
};

export * from "./constants";

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
  if (!isInVitest()) {
    throw new Error("testdir must be called inside vitest context");
  }

  const test = getCurrentTest();
  const suite = getCurrentSuite();

  const dirname = internalGenerateDirname(options?.dirname);

  const allowOutside = options?.allowOutside ?? false;

  // if the dirname is escaped from BASE_DIR, throw an error
  if (!allowOutside && !dirname.startsWith(BASE_DIR)) {
    throw new Error(`The directory name must start with '${BASE_DIR}'`);
  }

  const { path, remove } = await originalTestdir(files, {
    dirname,
  });

  if (options?.cleanup ?? true) {
    if (test != null) {
      onTestFinished(async () => {
        await remove();
      });
    } else if (suite != null) {
      afterAll(async () => {
        await remove();
      });
    } else {
      throw new Error("testdir must be called inside vitest context");
    }
  }

  return path;
}

testdir.from = (fsPath: string, options?: TestdirFromOptions) => {
  return testdirSync(fromFileSystemSync(fsPath, {
    ...options?.fromFS,
  }), {
    dirname: options?.dirname,
  });
};

/**
 * Generates the path for a test directory.
 *
 * @param {string?} dirname - The directory name to use.
 *
 * If not provided, a directory name will be generated based on the test name.
 *
 * @returns {string} The path of the current test directory.
 * @throws An error if `testdir` is called outside of a test.
 */
testdir.dirname = (dirname?: string): string => {
  if (!isInVitest()) {
    throw new Error("testdir must be called inside vitest context");
  }

  return internalGenerateDirname(dirname);
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
  if (!isInVitest()) {
    throw new Error("testdir must be called inside vitest context");
  }

  const test = getCurrentTest();
  const suite = getCurrentSuite();

  const dirname = internalGenerateDirname(options?.dirname);

  const allowOutside = options?.allowOutside ?? false;

  // if the dirname is escaped from BASE_DIR, throw an error
  if (!allowOutside && !dirname.startsWith(BASE_DIR)) {
    throw new Error(`The directory name must start with '${BASE_DIR}'`);
  }

  const { path, remove } = originalTestdirSync(files, {
    dirname,
  });

  if (options?.cleanup ?? true) {
    if (test != null) {
      onTestFinished(() => {
        remove();
      });
    } else if (suite != null) {
      afterAll(() => {
        remove();
      });
    } else {
      throw new Error("testdir must be called inside vitest context");
    }
  }

  return path;
}

/**
 * Generates the path for a test directory.
 *
 * @param {string?} dirname - The directory name to use.
 *
 * If not provided, a directory name will be generated based on the test name.
 *
 * @returns {string} The path of the current test directory.
 * @throws An error if `testdir` is called outside of a test.
 */
testdirSync.dirname = (dirname?: string): string => {
  if (!isInVitest()) {
    throw new Error("testdirSync must be called inside vitest context");
  }

  return internalGenerateDirname(dirname);
};
