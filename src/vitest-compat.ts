import type { RunnerTask, SuiteCollector } from "vitest";
import { createRequire } from "node:module";

type CurrentSuiteGetter = () => SuiteCollector | undefined;
type CurrentTestGetter = () => RunnerTask | undefined;

let currentSuiteGetter: CurrentSuiteGetter | null = null;
let currentTestGetter: CurrentTestGetter | null = null;
let loadedSuite: boolean | null = null;
let loadedTest: boolean | null = null;

const require = createRequire(import.meta.url);

function loadFromVitest(): boolean {
  try {
    const vitest = require("vitest") as {
      TestRunner?: {
        getCurrentSuite?: CurrentSuiteGetter;
        getCurrentTest?: CurrentTestGetter;
      };
    };
    const testRunner = vitest.TestRunner;
    if (testRunner) {
      if (typeof testRunner.getCurrentSuite === "function") {
        currentSuiteGetter = testRunner.getCurrentSuite;
        loadedSuite = true;
      }
      if (typeof testRunner.getCurrentTest === "function") {
        currentTestGetter = testRunner.getCurrentTest;
        loadedTest = true;
      }
    }
    return loadedSuite === true || loadedTest === true;
  } catch {
    return false;
  }
}

function loadTestFromRunners(): boolean {
  try {
    const runnerModule = require("vitest/runners") as {
      TestRunner?: {
        getCurrentTest?: CurrentTestGetter;
      };
      VitestTestRunner?: {
        getCurrentTest?: CurrentTestGetter;
      };
    };
    const runner = runnerModule.TestRunner || runnerModule.VitestTestRunner;
    if (runner && typeof runner.getCurrentTest === "function") {
      currentTestGetter = runner.getCurrentTest;
      loadedTest = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function loadSuiteFromRunners(): boolean {
  try {
    const runnerModule = require("vitest/runners") as {
      TestRunner?: {
        getCurrentSuite?: CurrentSuiteGetter;
      };
      VitestTestRunner?: {
        getCurrentSuite?: CurrentSuiteGetter;
      };
    };
    const runner = runnerModule.TestRunner || runnerModule.VitestTestRunner;
    if (runner && typeof runner.getCurrentSuite === "function") {
      currentSuiteGetter = runner.getCurrentSuite;
      loadedSuite = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function loadTestFromSuiteModule(): boolean {
  try {
    const suite = require("vitest/suite") as {
      getCurrentTest?: CurrentTestGetter;
    };
    if (typeof suite.getCurrentTest === "function") {
      currentTestGetter = suite.getCurrentTest;
      loadedTest = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function loadSuiteFromSuiteModule(): boolean {
  try {
    const suite = require("vitest/suite") as {
      getCurrentSuite?: CurrentSuiteGetter;
    };
    if (typeof suite.getCurrentSuite === "function") {
      currentSuiteGetter = suite.getCurrentSuite;
      loadedSuite = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getCurrentSuite(): SuiteCollector {
  if (loadedSuite !== true) {
    if (loadedSuite === null) {
      loadedSuite = loadFromVitest() || loadSuiteFromRunners() || loadSuiteFromSuiteModule();
    }
    if (!loadedSuite) {
      throw new Error("Failed to load Vitest suite methods");
    }
  }
  const suite = currentSuiteGetter!();
  if (!suite) {
    throw new Error("getCurrentSuite called outside an active suite context");
  }

  return suite;
}

export function getCurrentTest(): RunnerTask {
  if (loadedTest !== true) {
    if (loadedTest === null) {
      loadedTest = loadFromVitest() || loadTestFromRunners() || loadTestFromSuiteModule();
    }
    if (!loadedTest) {
      throw new Error("Failed to load Vitest test methods");
    }
  }
  const test = currentTestGetter!();
  if (!test) {
    throw new Error("getCurrentTest called outside an active test context");
  }

  return test;
}
