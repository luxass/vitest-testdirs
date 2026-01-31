import type { RunnerTask, SuiteCollector } from "vitest";

type CurrentSuiteGetter = () => SuiteCollector | undefined;
type CurrentTestGetter = () => RunnerTask | undefined;

let currentSuiteGetter: CurrentSuiteGetter = () => undefined;
let currentTestGetter: CurrentTestGetter = () => undefined;

async function loadFromRunner(): Promise<boolean> {
  try {
    const runners = await import("vitest/runners");
    const Runner = (runners as Record<string, unknown>).TestRunner
      || (runners as Record<string, unknown>).VitestTestRunner;
    if (Runner && (typeof Runner === "function" || typeof Runner === "object")) {
      const runner = Runner as {
        getCurrentSuite?: CurrentSuiteGetter;
        getCurrentTest?: CurrentTestGetter;
      };
      if (typeof runner.getCurrentSuite === "function" && typeof runner.getCurrentTest === "function") {
        currentSuiteGetter = () => runner.getCurrentSuite?.call(Runner);
        currentTestGetter = () => runner.getCurrentTest?.call(Runner);
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

async function loadFromSuite(): Promise<boolean> {
  try {
    const suite = await import("vitest/suite");
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

if (!(await loadFromRunner())) {
  await loadFromSuite();
}

export function getCurrentSuite(): SuiteCollector | undefined {
  return currentSuiteGetter();
}

export function getCurrentTest(): RunnerTask | undefined {
  return currentTestGetter();
}
