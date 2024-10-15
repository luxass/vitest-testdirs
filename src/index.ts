/**
 * @module
 *
 * Vitest Testdirs - A utility to create a temporary directory with files and directories for testing.
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

export { createFileTree, createFileTreeSync } from "./file-tree";
export type {
  DirectoryContent,
  DirectoryJSON,
  TestdirLink,
  TestdirSymlink,
} from "./types";
export {
  BASE_DIR,
  DIR_REGEX,
  fromFileSystem,
  fromFileSystemSync,
  getDirNameFromTask,
  isLink,
  isSymlink,
  link,
  symlink,
  testdir,
  testdirSync,
} from "./utils";

export type { TestdirOptions } from "./utils";
