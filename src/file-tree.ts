/**
 * This module contains functions for creating file trees.
 * @module file-tree
 *
 * @example
 * ```ts
 * import { createFileTree, createFileTreeSync } from "vitest-testdirs/file-tree";
 *
 * const files = {
 *   nested: {
 *     "file.txt": "Hello, World!",
 *   },
 *   "file.txt": "Hello, World!",
 * };
 *
 * await createFileTree("./path/to/dir", files);
 * createFileTreeSync("./path/to/dir", files);
 *
 */

import type { DirectoryContent, DirectoryJSON, TestdirLink, TestdirSymlink } from "./types";
import {
  linkSync,
  mkdirSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { link, mkdir, symlink, writeFile } from "node:fs/promises";
import { dirname, normalize, resolve } from "node:path";
import { FIXTURE_ORIGINAL_PATH } from "./constants";
import { isLink, isSymlink } from "./utils";

/**
 * Creates a file tree at the specified path using the provided files object.
 * The files object represents the directory structure and file contents of the tree.
 *
 * @param {string} path - The path where the file tree should be created.
 * @param {DirectoryJSON} files - An object representing the directory structure and file contents of the tree.
 */
export async function createFileTree(
  path: string,
  files: DirectoryJSON,
): Promise<void> {
  for (let filename in files) {
    let data = files[filename];
    filename = resolve(path, filename);

    // check if file is a object with the link symbol
    if (isLink(data)) {
      await link(resolve(dirname(filename), data.path), filename);
      continue;
    }

    if (isSymlink(data)) {
      if (files[FIXTURE_ORIGINAL_PATH] != null) {
        const original = normalize(files[FIXTURE_ORIGINAL_PATH]);

        console.log("original", original);
        console.log("path", path);

        console.log("process.cwd", process.cwd());
        // we need to replace here due to the fact that we call `createFileTree` recursively,
        // and when we do it with a nested directory, the path is now the full path, and not just the relative path.
        const tmpPath = normalize(path.replace(
          // eslint-disable-next-line node/prefer-global/process
          `${process.cwd()}/`,
          "",
        ));
        const pathLevels = tmpPath.split("/").filter(Boolean).length;
        const originalLevels = original.split("/").filter(Boolean).length;

        if (pathLevels < originalLevels) {
          const diff = originalLevels - pathLevels;
          data.path = data.path.replace("../".repeat(diff), "");
        } else if (pathLevels > originalLevels) {
          const diff = pathLevels - originalLevels;
          data.path = "../".repeat(diff) + data.path;
        }
      }

      await symlink(
        data.path,
        filename,
        isDir(filename, data.path) ? "junction" : "file",
      );
      continue;
    }

    if (isPrimitive(data) || data instanceof Uint8Array) {
      const dir = dirname(filename);
      await mkdir(dir, {
        recursive: true,
      });

      if (
        typeof data === "number"
        || typeof data === "boolean"
        || data == null
        || typeof data === "bigint"
        || typeof data === "symbol"
      ) {
        data = String(data);
      }

      await writeFile(filename, data);
    } else {
      await mkdir(filename, {
        recursive: true,
      });

      await createFileTree(filename, data);
    }
  }
}

/**
 * Creates a file tree at the specified path using the provided files object.
 * The files object represents the directory structure and file contents of the tree.
 *
 * @param {string} path - The path where the file tree should be created.
 * @param {DirectoryJSON} files - The files object representing the file tree.
 */
export function createFileTreeSync(path: string, files: DirectoryJSON): void {
  for (let filename in files) {
    let data = files[filename];
    filename = resolve(path, filename);

    // check if file is a object with the link symbol
    if (isLink(data)) {
      linkSync(resolve(dirname(filename), data.path), filename);
      continue;
    }

    if (isSymlink(data)) {
      if (files[FIXTURE_ORIGINAL_PATH] != null) {
        const original = normalize(files[FIXTURE_ORIGINAL_PATH]);

        // we need to replace here due to the fact that we call `createFileTree` recursively,
        // and when we do it with a nested directory, the path is now the full path, and not just the relative path.
        const tmpPath = normalize(path.replace(
          // eslint-disable-next-line node/prefer-global/process
          `${process.cwd()}/`,
          "",
        ));
        const pathLevels = tmpPath.split("/").filter(Boolean).length;
        const originalLevels = original.split("/").filter(Boolean).length;

        if (pathLevels < originalLevels) {
          const diff = originalLevels - pathLevels;
          data.path = data.path.replace("../".repeat(diff), "");
        } else if (pathLevels > originalLevels) {
          const diff = pathLevels - originalLevels;
          data.path = "../".repeat(diff) + data.path;
        }
      }

      symlinkSync(
        data.path,
        filename,
        isDir(filename, data.path) ? "junction" : "file",
      );
      continue;
    }

    if (isPrimitive(data) || data instanceof Uint8Array) {
      const dir = dirname(filename);
      mkdirSync(dir, {
        recursive: true,
      });

      if (
        typeof data === "number"
        || typeof data === "boolean"
        || data == null
        || typeof data === "bigint"
        || typeof data === "symbol"
      ) {
        data = String(data);
      }

      writeFileSync(filename, data);
    } else {
      mkdirSync(filename, {
        recursive: true,
      });

      createFileTreeSync(filename, data);
    }
  }
}

/**
 * Checks if the given data is a primitive value.
 *
 * @internal
 * @param {unknown} data - The data to be checked.
 * @returns {data is Exclude<DirectoryContent, TestdirSymlink | TestdirLink | DirectoryJSON>} `true` if the data is a primitive value, `false` otherwise.
 */
function isPrimitive(data: unknown): data is Exclude<DirectoryContent, TestdirSymlink | TestdirLink | DirectoryJSON> {
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

/**
 * Checks if a given path is a directory.
 *
 * @internal
 * @param {string} abs - The absolute path of the file or directory.
 * @param {string} target - The target directory to check.
 * @returns {boolean} `true` if the path is a directory, `false` otherwise.
 */
function isDir(abs: string, target: string): boolean {
  try {
    return statSync(resolve(dirname(abs), target)).isDirectory();
    // eslint-disable-next-line unused-imports/no-unused-vars
  } catch (err) {
    return false;
  }
}
