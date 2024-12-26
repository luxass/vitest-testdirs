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

export { FIXTURE_ORIGINAL_PATH, FIXTURE_TYPE_LINK_SYMBOL, FIXTURE_TYPE_SYMLINK_SYMBOL } from "./constants";
export type { FromFileSystemOptions } from "./file-system";
export { fromFileSystem, fromFileSystemSync } from "./file-system";

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
  getDirNameFromTask,
  isLink,
  isSymlink,
  link,
  symlink,
  testdir,
  testdirSync,
} from "./utils";

export type { TestdirOptions } from "./utils";
