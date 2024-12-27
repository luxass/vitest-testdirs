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
// index.test.ts
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
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

## Metadata on Windows

When you are using `withMetadata` on a Windows filesystem, the permission is not set correctly.
This is because how windows work, and libuv not supporting Windows ACLs.

```ts
import { readFile, writeFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { testdir, withMetadata } from "../src";

it("windows", async () => {
  const path = await testdir({
    "file1.txt": withMetadata("Hello, World!", { mode: 0o444 }),
  });

  try {
    await writeFile(`${path}/file1.txt`, "Hello, Vitest!");
    // This should throw an error, but not on Windows
  } catch (err) {
    console.log(err);
  }

  const content = await readFile(`${path}/file1.txt`, "utf8");
  // The content is now changes, but it should not be possible to write to the file

  expect(content).not.toBe("Hello, Vitest!");
  expect(content).toBe("Hello, World!");
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
