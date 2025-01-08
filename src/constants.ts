/**
 * Symbol used to identify test directory link fixtures.
 * This symbol is used internally to mark and distinguish link fixtures from other fixture types.
 */
export const FIXTURE_TYPE_LINK_SYMBOL = Symbol("testdir-link");

/**
 * Symbol used to identify symlink paths in fixture type definitions.
 * This symbol helps distinguish symlinks from regular files and directories.
 */
export const FIXTURE_TYPE_SYMLINK_SYMBOL = Symbol("testdir-symlink");

/**
 * Symbol representing the original file path of a test fixture definition.
 * Used internally to track and restore the original paths of test directories.
 */
export const FIXTURE_ORIGINAL_PATH_SYMBOL = Symbol("testdir-original-path");

/**
 * Symbol representing the metadata of a test fixture definition.
 * Used internally to store and retrieve metadata about test definitions.
 */
export const FIXTURE_METADATA_SYMBOL = Symbol("testdir-metadata");

/**
 * The base directory for test directories.
 */
export const BASE_DIR = ".vitest-testdirs";
