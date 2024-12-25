/**
 * This module contains constants used throughout the project.
 * @module constants
 */

/**
 * Symbol used to identify test directory link fixtures.
 * This symbol is used internally to mark and distinguish link fixtures from other fixture types.
 * @const {symbol}
 */
export const FIXTURE_TYPE_LINK_SYMBOL = Symbol("testdir-link");

/**
 * Symbol used to identify symlink paths in fixture type definitions.
 * This symbol helps distinguish symlinks from regular files and directories.
 *
 * @const {symbol}
 */
export const FIXTURE_TYPE_SYMLINK_SYMBOL = Symbol("testdir-symlink");

/**
 * Symbol representing the original file path of a test fixture directory.
 * Used internally to track and restore the original paths of test directories.
 *
 * @const {symbol}
 */
export const FIXTURE_ORIGINAL_PATH = Symbol("testdir-original-path");
