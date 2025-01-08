# vitest-testdirs

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![jsr version][jsr-version-src]][jsr-version-href]

A utility for Vitest to create isolated test directories

> [!NOTE]
> Version 2.0 has been released with breaking changes! See the [migration guide](#migrating-to-v2) below.

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

When you are using `withMetadata` on a Windows filesystem, the permission is not set correctly on directories. This is not something that can be fixed, in this library as the issue is either coming from node or libuv.

It mostly happens on Directories. You can try out the following example to see the issue.

```ts
import { readFile, writeFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { testdir, withMetadata } from "../src";

it("windows", async () => {
  const path = await testdir({
    "file.txt": withMetadata("Hello, World!", { mode: 0o444 }), // This works
    "nested": withMetadata({
      "file.txt": "Hello, World!",
    }, { mode: 0o555 }), // This doesn't work.
  });

  try {
    await writeFile(`${path}/file.txt`, "Hello, Vitest!");
    // This should throw an error
  } catch (err) {
    console.log(err);
  }

  const content = await readFile(`${path}/file.txt`, "utf8");

  expect(content).not.toBe("Hello, Vitest!");
  expect(content).toBe("Hello, World!");

  try {
    await writeFile(`${path}/nested/file.txt`, "Hello, Vitest!");
    // This should throw an error, but not on Windows
  } catch (err) {
    console.log(err);
  }

  const nestedContent = await readFile(`${path}/nested/file.txt`, "utf8");
  // The content is now changed, but it should not be possible to write to the file

  expect(nestedContent).not.toBe("Hello, Vitest!");
  expect(nestedContent).toBe("Hello, World!");
});
```

## Migrating to V2

Version 2 brings several improvements and breaking changes. Here is a list of changes you need to make to migrate to V2.

- require Vitest v2.0.5 or higher
- `withMetadata` is now `metadata`
- removed `vitest-testdirs/file-system` & `vitest-testdirs/file-tree` exports.
  > You can now just import them directly from `vitest-testdirs`.
- removed `vitest-testdirs/utils` export and replaced it with `vitest-testdirs/helpers` import.
  > This is where we export the different helper functions, like `metadata`, `symlink` and so on.

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/vitest-testdirs?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/vitest-testdirs
[npm-downloads-src]: https://img.shields.io/npm/dm/vitest-testdirs?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/vitest-testdirs
[jsr-version-src]: https://jsr.io/badges/@luxass/vitest-testdirs?style=flat&labelColor=18181B&logoColor=4169E1
[jsr-version-href]: https://jsr.io/@luxass/vitest-testdirs
