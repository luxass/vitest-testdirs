import type { RunnerTask, SuiteCollector } from "vitest";
import { createRequire } from "node:module";

type CurrentSuiteGetter = () => SuiteCollector;
type CurrentTestGetter = () => RunnerTask;

let currentSuiteGetter: CurrentSuiteGetter | null = null;
let currentTestGetter: CurrentTestGetter | null = null;
let loadedSuite = false;
let loadedTest = false;

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
  } catch {
    return false;
  }

  return false;
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
  } catch {
    return false;
  }

  return false;
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
  } catch {
    return false;
  }

  return false;
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
  } catch {
    return false;
  }

  return false;
}

function loadTestFromSuite(): boolean {
  try {
    const suite = require("vitest/suite") as {
      getCurrentTest?: CurrentTestGetter;
    };
    if (typeof suite.getCurrentTest === "function") {
      currentTestGetter = suite.getCurrentTest;
      loadedTest = true;
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function loadSuiteFromSuite(): boolean {
  try {
    const suite = require("vitest/suite") as {
      getCurrentSuite?: CurrentSuiteGetter;
    };
    if (typeof suite.getCurrentSuite === "function") {
      currentSuiteGetter = suite.getCurrentSuite;
      loadedSuite = true;
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function ensureLoadedSuite(): void {
  if (loadedSuite) {
    return;
  }

  const loaded = loadSuiteFromVitest() || loadSuiteFromRunners() || loadSuiteFromSuite();
  if (!loaded) {
    throw new Error("getCurrentSuite must be called inside vitest context");
  }
}

function ensureLoadedTest(): void {
  if (loadedTest) {
    return;
  }

  const loaded = loadTestFromVitest() || loadTestFromRunners() || loadTestFromSuite();
  if (!loaded) {
    throw new Error("getCurrentTest must be called inside vitest context");
  }
}

function getSuiteGetter(): CurrentSuiteGetter {
  ensureLoadedSuite();
  if (!currentSuiteGetter) {
    throw new Error("getCurrentSuite must be called inside vitest context");
  }

  return currentSuiteGetter;
}

function getTestGetter(): CurrentTestGetter {
  ensureLoadedTest();
  if (!currentTestGetter) {
    throw new Error("getCurrentTest must be called inside vitest context");
  }

  return currentTestGetter;
}

export function getCurrentSuite(): SuiteCollector {
  const suite = getSuiteGetter()();
  if (!suite) {
    throw new Error("getCurrentSuite must be called inside vitest context");
  }

  return suite;
}

export function getCurrentTest(): RunnerTask {
  const test = getTestGetter()();
  if (!test) {
    throw new Error("getCurrentTest must be called inside vitest context");
  }

  return test;
}
