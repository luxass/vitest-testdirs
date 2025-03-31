/**
 * Vitest Testdirs - A utility to create a temporary directory with files and directories for testing.
 * @module vitest
 *
 * @example
 * ```ts
 * import { it } from "vitest-testdirs/vitest";
 *
 * // `test` is also available
 * it("my test", async ({ testdir }) => {
 *   const dir = await testdir({
 *     "file.txt": "Hello World",
 *     "nested/file.json": { key: "value" },
 *   });
 *
 *   console.error(dir);
 * });
 * ```
 */

import type { TestAPI, TestContext } from "vitest";
import type { DirectoryJSON, TestdirOptions } from "./index";
import { test as baseTest } from "vitest";
import { testdir } from "./index";

interface TestWithOptionsContext extends TestContext {
  testdir: (files: DirectoryJSON, options?: TestdirOptions) => Promise<string>;
}

export const test: TestAPI<{
  testdir: (files: DirectoryJSON, options?: TestdirOptions) => Promise<string>;
}> = baseTest.extend<{
  testdir: (files: DirectoryJSON, options?: TestdirOptions) => Promise<string>;
}>({
      // eslint-disable-next-line no-empty-pattern
      testdir: async ({}, use) => {
        const testdirFn = async (files: DirectoryJSON, options?: TestdirOptions) => {
          return testdir(files, options);
        };
        await use(testdirFn);
      },
    });

export const it = test;

export type { TestWithOptionsContext };
