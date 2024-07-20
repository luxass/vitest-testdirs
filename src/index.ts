export type { DirectoryJSON, DirectoryContent, TestdirLink, TestdirSymlink } from "./types";
export {
  testdir,
  testdirSync,
  BASE_DIR,
  DIR_REGEX,
  getDirNameFromTask,
  isLink,
  isSymlink,
  link,
  symlink,
} from "./utils";
export type { TestdirOptions } from "./utils";

export { createFileTree, createFileTreeSync } from "./file-tree";
