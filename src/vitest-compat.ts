import type { RunnerTask, SuiteCollector } from "vitest";

type CurrentSuiteGetter = () => SuiteCollector | undefined;
type CurrentTestGetter = () => RunnerTask | undefined;

let currentSuiteGetter: CurrentSuiteGetter | null = null;
let currentTestGetter: CurrentTestGetter | null = null;
let loadedSuite: boolean | null = null;
let loadedTest: boolean | null = null;

async function tryLoad() {
  try {
    const vitest = (await import("vitest")) as typeof import("vitest") & {
      TestRunner?: any;
    };
    const testRunner = vitest?.TestRunner;

    if (testRunner == null) {
      throw new Error("Vitest TestRunner is not available");
    }

    if (typeof testRunner.getCurrentSuite === "function") {
      currentSuiteGetter = testRunner.getCurrentSuite;
      loadedSuite = true;
    }

    if (typeof testRunner.getCurrentTest === "function") {
      currentTestGetter = testRunner.getCurrentTest;
      loadedTest = true;
    }
  } catch {}

  // If both were loaded, no need to continue
  if (loadedSuite === true && loadedTest === true) {
    return;
  }

  try {
    const suite = (await import("vitest/suite"));
    if (loadedSuite !== true && typeof suite.getCurrentSuite === "function") {
      currentSuiteGetter = suite.getCurrentSuite;
      loadedSuite = true;
    }
    if (loadedTest !== true && typeof suite.getCurrentTest === "function") {
      currentTestGetter = suite.getCurrentTest;
      loadedTest = true;
    }
  } catch {}

  if (loadedSuite === null) loadedSuite = false;
  if (loadedTest === null) loadedTest = false;
}

// eslint-disable-next-line antfu/no-top-level-await
await tryLoad();

export function getCurrentSuite(): SuiteCollector {
  if (loadedSuite !== true) {
    // Module should have blocked on import; if it didn't (e.g. top-level await was disabled),
    // make sure Vitest is available at module evaluation time so the internal getters can be loaded.
    throw new Error(
      "Failed to load Vitest suite methods. Ensure Vitest is installed and available at module evaluation time.",
    );
  }

  const suite = currentSuiteGetter!();
  if (!suite) {
    throw new Error("getCurrentSuite called outside an active suite context");
  }

  return suite;
}

export function getCurrentTest(): RunnerTask {
  if (loadedTest !== true) {
    // Module should have blocked on import; if it didn't (e.g. top-level await was disabled),
    // make sure Vitest is available at module evaluation time so the internal getters can be loaded.
    throw new Error(
      "Failed to load Vitest test methods. Ensure Vitest is installed and available at module evaluation time.",
    );
  }

  const test = currentTestGetter!();
  if (!test) {
    throw new Error("getCurrentTest called outside an active test context");
  }

  return test;
}
