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

/**
 * Symbol used to identify test directory link fixtures.
 * This symbol is used internally to mark and distinguish link fixtures from other fixture types.
 */
export const FIXTURE_TYPE_LINK_SYMBOL = Symbol("testdir-link");

/**
 * Symbol used to identify symlink paths in fixture type definitions.
 * This symbol helps distinguish symlinks from regular files and directories.
 */
export const FIXTURE_TYPE_SYMLINK_SYMBOL = Symbol("testdir-symlink");

/**
 * Symbol representing the original file path of a test fixture definition.
 * Used internally to track and restore the original paths of test directories.
 */
export const FIXTURE_ORIGINAL_PATH = Symbol("testdir-original-path");

/**
 * Symbol representing the metadata of a test fixture definition.
 * Used internally to store and retrieve metadata about test definitions.
 */
export const FIXTURE_METADATA = Symbol("testdir-metadata");

export type { EncodingForFileFn, FromFileSystemOptions } from "./file-system";
export {
  fromFileSystem,
  fromFileSystemSync,
} from "./file-system";

export {
  createFileTree,
  createFileTreeSync,
} from "./file-tree";

export type {
  DirectoryContent,
  DirectoryJSON,
  FSMetadata,
  TestdirLink,
  TestdirMetadata,
  TestdirSymlink,
} from "./types";

export {
  BASE_DIR,
  DIR_REGEX,
  getDirNameFromTask,
  hasMetadata,
  isLink,
  isSymlink,
  link,
  symlink,
  testdir,
  testdirSync,
  withMetadata,
} from "./utils";

export type { TestdirOptions } from "./utils";
