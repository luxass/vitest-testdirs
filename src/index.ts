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

export type {
  DirectoryJSON,
  DirectoryContent,
  TestdirLink,
  TestdirSymlink,
} from "./types";
export {
  testdir,
  testdirSync,
  BASE_DIR,
  DIR_REGEX,
  getDirNameFromTask,
  isLink,
  isSymlink,
  link,
  symlink,
} from "./utils";
export type { TestdirOptions } from "./utils";

export { createFileTree, createFileTreeSync } from "./file-tree";
