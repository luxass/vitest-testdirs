# vitest-testdirs

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![jsr version][jsr-version-src]][jsr-version-href]

A utility for Vitest to create isolated test directories

## 📦 Installation

```bash
npm install vitest-testdirs --save-dev
```

## 🚀 Usage

```js
import { readFileSync } from "node:fs";
// index.test.ts
import { readFile } from "node:fs/promises";
import { describe, expect, vi } from "vitest";
import { testdir, testdirSync } from "vitest-testdirs";

describe("testdir", () => {
  it("isolated-test", async () => {
    const path = await testdir({
      "file1.txt": "Hello, World!",
      "file2.txt": "Hello, Vitest!",
    });

    expect(path).toBeDefined();
    expect(path).toContain(".vitest-testdirs/vitest-testdir-isolated-test");

    const file = await readFile(`${path}/file1.txt`, "utf8");
    expect(file).toBe("Hello, World!");
  });
});

describe("testdirSync", () => {
  it("isolated-test", () => {
    const path = testdirSync({
      "file1.txt": "Hello, World!",
      "file2.txt": "Hello, Vitest!",
    });

    expect(path).toBeDefined();
    expect(path).toContain(".vitest-testdirs/vitest-testdirSync-isolated-test");

    const file = readFileSync(`${path}/file1.txt`, "utf8");
    expect(file).toBe("Hello, World!");
  });
});
```

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/vitest-testdirs?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/vitest-testdirs
[npm-downloads-src]: https://img.shields.io/npm/dm/vitest-testdirs?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/vitest-testdirs
[jsr-version-src]: https://jsr.io/badges/@luxass/vitest-testdirs?style=flat&labelColor=18181B&logoColor=4169E1
[jsr-version-href]: https://jsr.io/@luxass/vitest-testdirs
