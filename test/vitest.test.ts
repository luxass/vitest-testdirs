import { test } from "../src/vitest";

test("my test", async ({ testdir }) => {
  const dir = await testdir({
    "file.txt": "Hello World",
    "nested/file.json": { key: "value" },
  }, {
    cleanup: false,
  });

  console.error(dir);
});
