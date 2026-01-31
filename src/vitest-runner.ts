import type { RunnerTask, SuiteCollector } from "vitest";
import { createRequire } from "node:module";

type CurrentSuiteGetter = () => SuiteCollector | undefined;
type CurrentTestGetter = () => RunnerTask | undefined;

let currentSuiteGetter: CurrentSuiteGetter | null = null;
let currentTestGetter: CurrentTestGetter | null = null;
const require = createRequire(import.meta.url);

function loadFromRunner(): boolean {
  try {
    const runners = require("vitest/runners") as Record<string, unknown>;
    const Runner = runners.TestRunner || runners.VitestTestRunner;
    if (Runner && (typeof Runner === "function" || typeof Runner === "object")) {
      const runner = Runner as {
        getCurrentSuite?: CurrentSuiteGetter;
        getCurrentTest?: CurrentTestGetter;
      };
      if (typeof runner.getCurrentSuite === "function" && typeof runner.getCurrentTest === "function") {
        currentSuiteGetter = runner.getCurrentSuite.bind(runner);
        currentTestGetter = runner.getCurrentTest.bind(runner);
        return true;
      }
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

  if (!loadFromRunner()) {
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
