export type { DirectoryJSON, DirectoryContent } from "./types";

export {
  testdir,
  testdirSync,
  BASE_DIR,
  DIR_REGEX,
  getDirNameFromTask,
} from "./utils";
export type { TestdirOptions } from "./utils";

export { createFileTree, createFileTreeSync } from "./file-tree";
