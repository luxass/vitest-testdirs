import type { DirectoryJSON } from "./types";
import { readdirSync, readFileSync, readlinkSync, statSync } from "node:fs";
import { readdir, readFile, readlink, stat } from "node:fs/promises";
import { normalize } from "node:path";
import { FIXTURE_ORIGINAL_PATH } from "./constants";
import { symlink } from "./utils";

export interface FromFileSystemOptions {
  /**
   * An array of file names to
   * ignore when reading the directory.
   * @default []
   * @example
   * ```ts
   * const files = await fromFileSystem("path/to/dir", {
   *  ignore: ["node_modules", ".git"],
   * });
   * ```
   */
  ignore?: string[];

  /**
   * Whether to follow symbolic links.
   * @default true
   */
  followLinks?: boolean;
}

/**
 * Recursively reads the contents of a directory and returns a JSON representation of the directory structure.
 *
 * @param {string} path - The path to the directory to read.
 * @param {FromFileSystemOptions?} options - The options
 * @returns {Promise<DirectoryJSON} A promise that resolves to a `DirectoryJSON` object representing the directory structure.
 *
 * @remarks
 * - If the specified path is not a directory, an empty object is returned.
 * - Each directory is represented as an object where the keys are the file or directory names and the values are either the file contents or another directory object.
 * - This function uses `readdir` to read the directory contents and `readFile` to read file contents.
 */
export async function fromFileSystem(path: string, options?: FromFileSystemOptions): Promise<DirectoryJSON> {
  if (!await isDirectory(path)) {
    return {};
  }

  const files: DirectoryJSON = {
    [FIXTURE_ORIGINAL_PATH]: normalize(path),
  };

  const dirFiles = await readdir(path, {
    withFileTypes: true,
  });

  const ignore = options?.ignore ?? [];
  const followLinks = options?.followLinks ?? true;

  const filteredFiles = dirFiles.filter((file) => !ignore.includes(file.name));

  for (const file of filteredFiles) {
    const filePath = file.name;
    const fullPath = `${path}/${filePath}`;

    if (file.isDirectory()) {
      files[filePath] = await fromFileSystem(fullPath, options);
    } else if (followLinks && file.isSymbolicLink()) {
      files[filePath] = symlink(await readlink(fullPath));
    } else {
      files[filePath] = await readFile(fullPath, "utf8");
    }
  }

  return files;
}

/**
 * Recursively reads the contents of a directory and returns a JSON representation of the directory structure.
 *
 * @param {string} path - The path to the directory to read.
 * @param {FromFileSystemOptions?} options - The options
 * @returns {DirectoryJSON} A `DirectoryJSON` object representing the directory structure.
 *
 * @remarks
 * - If the specified path is not a directory, an empty object is returned.
 * - Each directory is represented as an object where the keys are the file or directory names and the values are either the file contents or another directory object.
 * - This function uses `readdirSync` to read the directory contents and `readFileSync` to read file contents.
 */
export function fromFileSystemSync(path: string, options?: FromFileSystemOptions): DirectoryJSON {
  if (!isDirectorySync(path)) {
    return {};
  }

  const files: DirectoryJSON = {
    [FIXTURE_ORIGINAL_PATH]: normalize(path),
  };

  const dirFiles = readdirSync(path, {
    withFileTypes: true,
  });

  const ignore = options?.ignore ?? [];
  const followLinks = options?.followLinks ?? true;

  const filteredFiles = dirFiles.filter((file) => !ignore.includes(file.name));

  for (const file of filteredFiles) {
    const filePath = file.name;
    const fullPath = `${path}/${filePath}`;

    if (file.isDirectory()) {
      files[filePath] = fromFileSystemSync(fullPath, options);
    } else if (followLinks && file.isSymbolicLink()) {
      files[filePath] = symlink(readlinkSync(fullPath));
    } else {
      files[filePath] = readFileSync(fullPath, "utf-8");
    }
  }

  return files;
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const result = await stat(path);
    return result.isDirectory();
  } catch {
    return false;
  }
}

function isDirectorySync(path: string): boolean {
  try {
    const result = statSync(path);
    return result.isDirectory();
  } catch {
    return false;
  }
}
