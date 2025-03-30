import type { TestContext } from "vitest";
import type { DirectoryJSON, TestdirOptions } from "./index";
import { test as baseTest } from "vitest";
import { testdir } from "./index";

interface TestdirFixture {
  testdir: (files: Record<string, any>, options?: TestdirOptions) => Promise<string>;
}

interface TestFunction {
  (name: string, fn: (context: TestContext & TestdirFixture) => void | Promise<void>): void;
  (name: string, fn: (context: TestContext & TestdirFixture) => void | Promise<void>, timeout?: number): void;
}

export const test = baseTest.extend<TestdirFixture>({
  // eslint-disable-next-line no-empty-pattern
  testdir: async ({}, use) => {
    const testdirFn = async (files: DirectoryJSON, options?: TestdirOptions) => {
      return testdir(files, {
        ...options,
      });
    };
    await use(testdirFn);
  },
}) as TestFunction;

export type ExtendedTestContext = TestContext & TestdirFixture;
