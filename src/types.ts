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
  | TestdirSymlink;

export interface TestdirSymlink {
  [key: symbol]: typeof FIXTURE_TYPE_SYMLINK_SYMBOL;
  path: string;
}

export interface TestdirLink {
  [key: symbol]: typeof FIXTURE_TYPE_LINK_SYMBOL;
  path: string;
}

export interface DirectoryJSON<T extends DirectoryContent = DirectoryContent> {
  [key: string]: T | DirectoryJSON<T>;
}
