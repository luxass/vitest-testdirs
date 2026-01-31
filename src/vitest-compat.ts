import type { RunnerTask, SuiteCollector } from "vitest";
import { createRequire } from "node:module";

type CurrentSuiteGetter = () => SuiteCollector | undefined;
type CurrentTestGetter = () => RunnerTask | undefined;

let currentSuiteGetter: CurrentSuiteGetter | null = null;
let currentTestGetter: CurrentTestGetter | null = null;
let loadedSuite: boolean | null = null;
let loadedTest: boolean | null = null;

const require = createRequire(import.meta.url);

function loadFromVitest(loader: "suite" | "test"): boolean {
  try {
    const vitest = require("vitest") as {
      TestRunner?: {
        getCurrentSuite?: CurrentSuiteGetter;
        getCurrentTest?: CurrentTestGetter;
      };
    };
    const testRunner = vitest.TestRunner;
    if (!testRunner) {
      return false;
    }

    if (loader === "suite") {
      if (typeof testRunner.getCurrentSuite === "function") {
        currentSuiteGetter = testRunner.getCurrentSuite!;
        loadedSuite = true;
        return true;
      }
      return false;
    }

    if (typeof testRunner.getCurrentTest === "function") {
      currentTestGetter = testRunner.getCurrentTest!;
      loadedTest = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function loadFromSuiteModule(loader: "suite" | "test"): boolean {
  try {
    const suite = require("vitest/suite") as {
      getCurrentSuite?: CurrentSuiteGetter;
      getCurrentTest?: CurrentTestGetter;
    };

    if (loader === "suite") {
      if (typeof suite.getCurrentSuite === "function") {
        currentSuiteGetter = suite.getCurrentSuite!;
        loadedSuite = true;
        return true;
      }

      return false;
    }

    if (typeof suite.getCurrentTest === "function") {
      currentTestGetter = suite.getCurrentTest!;
      loadedTest = true;
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function getCurrentSuite(): SuiteCollector {
  if (loadedSuite === null) {
    loadedSuite = loadFromVitest("suite") || loadFromSuiteModule("suite");
  }
  if (loadedSuite !== true) {
    throw new Error("Failed to load Vitest suite methods");
  }

  const suite = currentSuiteGetter!();
  if (!suite) {
    throw new Error("getCurrentSuite called outside an active suite context");
  }

  return suite;
}

export function getCurrentTest(): RunnerTask {
  if (loadedTest === null) {
    loadedTest = loadFromVitest("test") || loadFromSuiteModule("test");
  }
  if (loadedTest !== true) {
    throw new Error("Failed to load Vitest test methods");
  }

  const test = currentTestGetter!();
  if (!test) {
    throw new Error("getCurrentTest called outside an active test context");
  }

  return test;
}
