/**
 * This module contains types used throughout the project.
 * @module types
 */

import type {
  FIXTURE_TYPE_LINK_SYMBOL,
  FIXTURE_TYPE_SYMLINK_SYMBOL,
} from "./constants";

export type DirectoryContent =
  | string
  | boolean
  | number
  | Uint8Array
  | null
  | undefined
  | bigint
  | symbol
  | TestdirSymlink
  | TestdirLink;

export interface TestdirSymlink {
  [key: symbol]: typeof FIXTURE_TYPE_SYMLINK_SYMBOL;
  path: string;
}

export interface TestdirLink {
  [key: symbol]: typeof FIXTURE_TYPE_LINK_SYMBOL;
  path: string;
}

export interface DirectoryJSON<T extends DirectoryContent = DirectoryContent> {
  /**
   * Is only set when generated by `fromFileSystem` or `fromFileSystemSync`.
   */
  [originalPath: symbol]: string | undefined;
  [key: string]: T | DirectoryJSON<T>;
}
