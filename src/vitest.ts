/**
 * Vitest Testdirs - A utility to create a temporary directory with files and directories for testing.
 * @module vitest
 *
 * @example
 * ```ts
 * import { it, withTestdir } from "vitest-testdirs/vitest";
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
 *
 * withTestdir("custom", {
 *   cleanup: false,
 *   // pass other vitest options
 * }, async ({ testdir }) => {
 *   const dir = await testdir({
 *     "file.txt": "Hello World",
 *     "nested/file.json": { key: "value" },
 *   });
 *
 *   console.error(dir);
 * });
 * ```
 */

import type { TestContext, TestOptions } from "vitest";
import type { DirectoryJSON, TestdirOptions } from "./index";
import { test as baseTest } from "vitest";
import { testdir } from "./index";

interface TestWithOptionsContext extends TestContext {
  testdir: (files: DirectoryJSON, options?: TestdirOptions) => Promise<string>;
}

let currentTestOptions: Partial<TestdirOptions> = {};

export const test = baseTest.extend<{
  testdir: (files: DirectoryJSON, options?: TestdirOptions) => Promise<string>;
}>({
      testdir: async ({ task }, use) => {
        const testdirFn = async (files: DirectoryJSON, options?: TestdirOptions) => {
          return testdir(files, {
            ...currentTestOptions,
            ...options,
            dirname: options?.dirname || currentTestOptions.dirname || task.name,
          });
        };
        await use(testdirFn);
      },
    });

export const it = test;

// override the test function to capture options
const originalTest = test;

// TODO(@luxass): find a better name
export function withTestdir(name: string, options: Partial<TestdirOptions> & Omit<TestOptions, "shuffle">, fn: (context: TestWithOptionsContext) => void | Promise<void>) {
  currentTestOptions = options;
  return originalTest(name, options as any, fn);
}

export type { TestWithOptionsContext };
