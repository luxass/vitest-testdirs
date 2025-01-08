/**
 * Vitest Testdirs - A utility to create a temporary directory with files and directories for testing.
 * @module helpers
 *
 * @example
 * ```ts
 * import { isSymlink } from "vitest-testdirs/helpers";
 * import { fromFileSystem } from "vitest-testdirs"
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

import type {
  DirectoryContent,
  DirectoryJSON,
  FSMetadata,
  TestdirLink,
  TestdirMetadata,
  TestdirSymlink,
} from "./types";
import { normalize } from "node:path";
import {
  FIXTURE_METADATA_SYMBOL,
  FIXTURE_TYPE_LINK_SYMBOL,
  FIXTURE_TYPE_SYMLINK_SYMBOL,
} from "./constants";

/**
 * Create a symlink to a file or directory
 * @param {string} path The path to link to
 * @returns {TestdirSymlink} A TestdirSymlink object
 */
export function symlink(path: string): TestdirSymlink {
  return {
    [FIXTURE_TYPE_SYMLINK_SYMBOL]: FIXTURE_TYPE_SYMLINK_SYMBOL,
    path: normalize(path),
  };
}

/**
 * Check if value is a TestdirSymlink
 * @param {unknown} value The value to check
 * @returns {value is TestdirSymlink} The same value
 */
export function isSymlink(value: unknown): value is TestdirSymlink {
  return (
    typeof value === "object"
    && value !== null
    && (value as TestdirSymlink)[FIXTURE_TYPE_SYMLINK_SYMBOL]
    === FIXTURE_TYPE_SYMLINK_SYMBOL
  );
}

/**
 * Create a link to a file or directory
 * @param {string} path The path to link to
 * @returns {TestdirLink} A TestdirLink object
 */
export function link(path: string): TestdirLink {
  return {
    [FIXTURE_TYPE_LINK_SYMBOL]: FIXTURE_TYPE_LINK_SYMBOL,
    path: normalize(path),
  };
}

/**
 * Check if value is a TestdirLink
 * @param {unknown} value The value to check
 * @returns {value is TestdirLink} The same value
 */
export function isLink(value: unknown): value is TestdirLink {
  return (
    typeof value === "object"
    && value !== null
    && (value as TestdirLink)[FIXTURE_TYPE_LINK_SYMBOL]
    === FIXTURE_TYPE_LINK_SYMBOL
  );
}

/**
 * Combines directory JSON with metadata to create a TestdirMetadata object.
 *
 * @param {DirectoryContent} content - The content you want to add metadata to
 * @param {FSMetadata} metadata - The FSMetadata object containing file system metadata
 * @returns {TestdirMetadata} A TestdirMetadata object containing both the directory structure and metadata
 *
 * @remarks
 * due to how permissions work on windows and `libuv` doesn't support windows acl's.
 * setting a directory to readonly on windows doesn't actually work, and will still be writable.
 */
export function metadata(content: DirectoryContent | DirectoryJSON, metadata: FSMetadata): TestdirMetadata {
  return {
    [FIXTURE_METADATA_SYMBOL]: metadata,
    content,
  };
}

/**
 * Check if value is a TestdirMetadata
 * @param {unknown} value The value to check
 * @returns {value is TestdirMetadata} The same value
 */
export function hasMetadata(value: unknown): value is TestdirMetadata {
  return (
    typeof value === "object"
    && value !== null
    && (value as TestdirMetadata)[FIXTURE_METADATA_SYMBOL] != null
  );
}

/**
 * Checks if the given data is a primitive value.
 *
 * @param {unknown} data - The data to be checked.
 * @returns {data is Exclude<DirectoryContent, TestdirSymlink | TestdirLink | DirectoryJSON | TestdirMetadata>} `true` if the data is a primitive value, `false` otherwise.
 */
export function isPrimitive(data: unknown): data is Exclude<DirectoryContent, TestdirSymlink | TestdirLink | DirectoryJSON | TestdirMetadata> {
  return (
    typeof data === "string"
    || typeof data === "number"
    || typeof data === "boolean"
    || data === null
    || data === undefined
    || typeof data === "bigint"
    || typeof data === "symbol"
    || data instanceof Uint8Array
  );
}
