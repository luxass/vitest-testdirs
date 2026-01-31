import type { RunnerTask, SuiteCollector } from "vitest";
import { createRequire } from "node:module";

type CurrentSuiteGetter = () => SuiteCollector;
type CurrentTestGetter = () => RunnerTask;

let currentSuiteGetter: CurrentSuiteGetter | null = null;
let currentTestGetter: CurrentTestGetter | null = null;
let loadedSuite = false;
let loadedTest = false;

const require = createRequire(import.meta.url);

function loadFromVitest(): boolean {
  try {
    const vitest = require("vitest") as {
      TestRunner?: {
        getCurrentSuite?: CurrentSuiteGetter;
        getCurrentTest?: CurrentTestGetter;
      };
    };
    if (vitest.TestRunner) {
      if (typeof vitest.TestRunner.getCurrentSuite === "function") {
        currentSuiteGetter = vitest.TestRunner.getCurrentSuite;
        loadedSuite = true;
      }
      if (typeof vitest.TestRunner.getCurrentTest === "function") {
        currentTestGetter = vitest.TestRunner.getCurrentTest;
        loadedTest = true;
      }
      return loadedSuite || loadedTest;
    }
  } catch {
    return false;
  }

  return false;
}

function loadFromRunners(): boolean {
  try {
    const runnerModule = require("vitest/runners") as {
      TestRunner?: {
        getCurrentSuite?: CurrentSuiteGetter;
        getCurrentTest?: CurrentTestGetter;
      };
      VitestTestRunner?: {
        getCurrentSuite?: CurrentSuiteGetter;
        getCurrentTest?: CurrentTestGetter;
      };
    };
    const runner = runnerModule.TestRunner || runnerModule.VitestTestRunner;
    if (runner) {
      if (typeof runner.getCurrentSuite === "function") {
        currentSuiteGetter = runner.getCurrentSuite;
        loadedSuite = true;
      }
      if (typeof runner.getCurrentTest === "function") {
        currentTestGetter = runner.getCurrentTest;
        loadedTest = true;
      }
      return loadedSuite || loadedTest;
    }
  } catch {
    return false;
  }

  return false;
}

function loadFromSuite(): boolean {
  try {
    const suite = require("vitest/suite") as {
      getCurrentSuite?: CurrentSuiteGetter;
      getCurrentTest?: CurrentTestGetter;
    };
    if (typeof suite.getCurrentSuite === "function") {
      currentSuiteGetter = suite.getCurrentSuite;
      loadedSuite = true;
    }
    if (typeof suite.getCurrentTest === "function") {
      currentTestGetter = suite.getCurrentTest;
      loadedTest = true;
    }
    return loadedSuite || loadedTest;
  } catch {
    return false;
  }

  return false;
}

function ensureLoadedSuite(): void {
  if (loadedSuite) {
    return;
  }

  const loaded = loadFromVitest() || loadFromRunners() || loadFromSuite();
  if (!loaded) {
    throw new Error("testdir must be called inside vitest context");
  }
}

function ensureLoadedTest(): void {
  if (loadedTest) {
    return;
  }

  const loaded = loadFromVitest() || loadFromRunners() || loadFromSuite();
  if (!loaded) {
    throw new Error("testdir must be called inside vitest context");
  }
}

function getSuiteGetter(): CurrentSuiteGetter {
  ensureLoadedSuite();
  if (!currentSuiteGetter) {
    throw new Error("testdir must be called inside vitest context");
  }

  return currentSuiteGetter;
}

function getTestGetter(): CurrentTestGetter {
  ensureLoadedTest();
  if (!currentTestGetter) {
    throw new Error("testdir must be called inside vitest context");
  }

  return currentTestGetter;
}

export function getCurrentSuite(): SuiteCollector {
  return getSuiteGetter()();
}

export function getCurrentTest(): RunnerTask {
  return getTestGetter()();
}
