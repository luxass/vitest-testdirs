import type { RunnerTask, SuiteCollector } from "vitest";
import { createRequire } from "node:module";

type CurrentSuiteGetter = () => SuiteCollector | undefined;
type CurrentTestGetter = () => RunnerTask | undefined;

let currentSuiteGetter: CurrentSuiteGetter | null = null;
let currentTestGetter: CurrentTestGetter | null = null;
let loadedSuite: boolean | null = null;
let loadedTest: boolean | null = null;

const require = createRequire(import.meta.url);

function loadTestFromVitest(): boolean {
  try {
    const vitest = require("vitest") as {
      TestRunner?: {
        getCurrentTest?: CurrentTestGetter;
      };
    };
    if (vitest.TestRunner && typeof vitest.TestRunner.getCurrentTest === "function") {
      currentTestGetter = vitest.TestRunner.getCurrentTest;
      loadedTest = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function loadSuiteFromVitest(): boolean {
  try {
    const vitest = require("vitest") as {
      TestRunner?: {
        getCurrentSuite?: CurrentSuiteGetter;
      };
    };
    if (vitest.TestRunner && typeof vitest.TestRunner.getCurrentSuite === "function") {
      currentSuiteGetter = vitest.TestRunner.getCurrentSuite;
      loadedSuite = true;
      return true;
    }
    return false;
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
      loadedSuite = loadSuiteFromVitest() || loadSuiteFromRunners() || loadSuiteFromSuiteModule();
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
      loadedTest = loadTestFromVitest() || loadTestFromRunners() || loadTestFromSuiteModule();
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
