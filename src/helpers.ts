/**
 * Vitest Testdirs - A utility to create a temporary directory with files and directories for testing.
 * @module helpers
 *
 * @example
 * ```ts
 * import { isSymlink } from "vitest-testdirs/helpers";
 *
 * const files = {
 *   "test.txt": "Hello, World!",
 *   "symlink.txt": symlink("test.txt"),
 * }
 *
 * if (isSymlink(files["test.txt"])) {
 *   console.log("test.txt is a symlink");
 * }
 *
 * if (isSymlink(files["symlink.txt"])) {
 *   console.log("symlink.txt is a symlink");
 * }
 *
 * // -> symlink.txt is a symlink
 * ```
 *
 * @example
 * ```ts
 * import { metadata, hasMetadata } from "vitest-testdirs/helpers";
 *
 * const files = {
 *   "test.txt": "Hello, World!",
 *   "readonly.txt": metadata("Hello, World!", { mode: 0o444 }), // read-only file
 * }
 *
 * if (hasMetadata(files["readonly.txt"])) {
 *   console.log("readonly.txt is read-only");
 * }
 *
 */

export * from "testdirs/helpers";
