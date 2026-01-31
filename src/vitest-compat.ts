import type { RunnerTask, SuiteCollector } from "vitest";
import { createRequire } from "node:module";

type CurrentSuiteGetter = () => SuiteCollector | undefined;
type CurrentTestGetter = () => RunnerTask | undefined;

let currentSuiteGetter: CurrentSuiteGetter | null = null;
let currentTestGetter: CurrentTestGetter | null = null;

const require = createRequire(import.meta.url);

function loadFromVitest(): boolean {
  try {
    const vitest = require("vitest") as {
      TestRunner?: {
        getCurrentSuite?: CurrentSuiteGetter;
        getCurrentTest?: CurrentTestGetter;
      };
    };
    if (
      vitest.TestRunner
      && typeof vitest.TestRunner.getCurrentSuite === "function"
      && typeof vitest.TestRunner.getCurrentTest === "function"
    ) {
      currentSuiteGetter = vitest.TestRunner.getCurrentSuite;
      currentTestGetter = vitest.TestRunner.getCurrentTest;
      return true;
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
    if (runner && typeof runner.getCurrentSuite === "function" && typeof runner.getCurrentTest === "function") {
      currentSuiteGetter = runner.getCurrentSuite;
      currentTestGetter = runner.getCurrentTest;
      return true;
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
    if (typeof suite.getCurrentSuite === "function" && typeof suite.getCurrentTest === "function") {
      currentSuiteGetter = suite.getCurrentSuite;
      currentTestGetter = suite.getCurrentTest;
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function ensureLoaded(): void {
  if (currentSuiteGetter && currentTestGetter) {
    return;
  }

  if (!loadFromVitest() && !loadFromRunners()) {
    loadFromSuite();
  }
}

export function getCurrentSuite(): SuiteCollector | undefined {
  ensureLoaded();
  return currentSuiteGetter?.();
}

export function getCurrentTest(): RunnerTask | undefined {
  ensureLoaded();
  return currentTestGetter?.();
}
