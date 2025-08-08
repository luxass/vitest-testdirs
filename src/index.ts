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

import type { FromFileSystemOptions } from "testdirs";
import { relative, resolve } from "node:path";
import { fromFileSystem, testdir as originalTestdir } from "testdirs";
import { createCustomTestdir } from "testdirs/factory";
import {
  afterAll,
  onTestFinished,
} from "vitest";
import {
  getCurrentSuite,
  getCurrentTest,
} from "vitest/suite";
import { z } from "zod";
import { BASE_DIR } from "./constants";
import { internalGenerateDirname, isInVitest } from "./utils";

export {
  BASE_DIR,
  FIXTURE_METADATA_SYMBOL,
  FIXTURE_ORIGINAL_PATH_SYMBOL,
  FIXTURE_TYPE_LINK_SYMBOL,
  FIXTURE_TYPE_SYMLINK_SYMBOL,
} from "./constants";

export {
  hasMetadata,
  isLink,
  isPrimitive,
  isSymlink,
  link,
  metadata,
  symlink,
} from "./helpers";

export {
  createFileTree,
  type DirectoryContent,
  type DirectoryJSON,
  type EncodingForFileFn,
  fromFileSystem,
  type FSMetadata,
  type TestdirFn,
  type TestdirLink,
  type TestdirMetadata,
  type TestdirResult,
  type TestdirSymlink,
} from "testdirs";

const optionsSchema = z.object({
  /**
   * The directory name to use.
   *
   * If not provided, a directory name will be generated based on the test name.
   */
  dirname: z.string().optional(),

  /**
   * Whether to cleanup the directory after the test has finished.
   * @default true
   */
  cleanup: z.boolean().default(true),

  /**
   * Whether to allow the directory to be created outside of the `.vitest-testdirs` directory.
   *
   * WARN:
   * This can be dangerous as it can delete files, folders, etc. where it shouldn't.
   * Use with caution.
   *
   * @default false
   */
  allowOutside: z.boolean().default(false),
});

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
export const testdir = createCustomTestdir(async ({ files, fixturePath, options }) => {
  if (!isInVitest()) {
    throw new Error("testdir must be called inside vitest context");
  }

  const test = getCurrentTest();
  const suite = getCurrentSuite();

  const allowOutside = options?.allowOutside ?? false;

  // if the dirname is escaped from BASE_DIR, throw an error
  if (!allowOutside) {
    const resolvedBase = resolve(BASE_DIR);
    const resolvedTarget = resolve(fixturePath);
    const rel = relative(resolvedBase, resolvedTarget);
    const isInside = rel !== "" && !rel.startsWith("..") && !resolve(resolvedBase, rel).startsWith("..");
    if (!isInside) {
      throw new Error(`The directory name must start with '${BASE_DIR}'`);
    }
  }

  const { path, remove } = await originalTestdir(files, {
    dirname: fixturePath,
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
}, {
  dirname(options) {
    return internalGenerateDirname(options?.dirname);
  },
  optionsSchema,
  extensions: {
    /**
     * Creates a test directory from an existing filesystem path
     *
     * @param {string} fsPath - The filesystem path to create the test directory from
     * @param {TestdirFromOptions & TestdirOptions} options - Configuration options
     * @returns {Promise<string>} A test directory instance initialized with the contents from the specified path
     *
     * @example
     * ```ts
     * const dir = testdir.from('./fixtures/basic');
     * ```
     */
    from: async (fsPath: string, options?: TestdirOptions & {
      fromFS?: FromFileSystemOptions;
    }): Promise<string> => {
      const { fromFS, ...rest } = options ?? {};
      const files = await fromFileSystem(fsPath, fromFS);
      return testdir(files, rest);
    },
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
    dirname: (dirname?: string): string => {
      if (!isInVitest()) {
        throw new Error("testdir must be called inside vitest context");
      }

      return internalGenerateDirname(dirname);
    },
  },
});
