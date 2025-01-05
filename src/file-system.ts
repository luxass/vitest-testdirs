/**
 * This module contains functions for creating json representations of file systems.
 * @module file-system
 *
 * @example
 * ```ts
 * import { fromFileSystem, fromFileSystemSync } from "vitest-testdirs/file-system";
 *
 *
 * await fromFileSystem("./path/to/dir");
 * fromFileSystemSync("./path/to/dir");
 * ```
 */

import type { DirectoryJSON } from "./types";
import { readdirSync, readFileSync, readlinkSync, statSync } from "node:fs";
import { readdir, readFile, readlink, stat } from "node:fs/promises";
import { normalize } from "node:path";
import { FIXTURE_ORIGINAL_PATH } from "./";
import { symlink } from "./utils";

/**
 * Options for customizing the behavior of the fromFileSystem functions.
 */
export interface FromFileSystemOptions {
  /**
   * An array of file names to
   * ignore when reading the directory.
   *
   * @default []
   *
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

  /**
   * An object with extra files to include in the directory structure.
   * @default {}
   *
   * @example
   * ```ts
   * const files = await fromFileSystem("path/to/dir", {
   *  extras: {
   *   "extra-file.txt": "This is an extra file",
   *  },
   * });
   * ```
   */
  extras?: DirectoryJSON;

  /**
   * A function that determines the encoding to be used for a file.
   * @default utf-8
   *
   * @example
   * ```ts
   * const files = await fromFileSystem("path/to/dir", {
   *  getEncodingForFile: (path) => "utf-8",
   * });
   * ```
   */
  getEncodingForFile?: EncodingForFileFn;
}

const DEFAULT_ENCODING_FOR_FILE_FN = () => "utf-8" as BufferEncoding;

/**
 * A function type that determines the encoding for a given file path.
 * @param {string} path - The path to the file.
 * @returns {BufferEncoding | null} The encoding to be used for the file, as a {@link BufferEncoding}.
 */
export type EncodingForFileFn = (path: string) => BufferEncoding | null;

/**
 * Processes a directory and its contents recursively, creating a JSON representation of the file system.
 *
 * @param {string} path - The absolute path to the directory to process
 * @param {Required<Omit<FromFileSystemOptions, "extras">>} options - Configuration options for processing the directory
 *
 * @returns {Promise<DirectoryJSON>} A Promise that resolves to a DirectoryJSON object representing the directory structure
 *          where keys are file/directory names and values are either:
 *          - A string containing file contents for regular files
 *          - A DirectoryJSON object for subdirectories
 *          - A symbolic link representation for symlinks (when followLinks is true)
 *
 * @throws {Error} If there are issues reading the directory or its contents
 */
async function processDirectory(
  path: string,
  options: Required<Omit<FromFileSystemOptions, "extras">>,
): Promise<DirectoryJSON> {
  const files: DirectoryJSON = {
    [FIXTURE_ORIGINAL_PATH]: normalize(path),
  };

  const dirFiles = await readdir(path, {
    withFileTypes: true,
  });

  const filteredFiles = dirFiles.filter((file) => !options.ignore.includes(file.name));

  for (const file of filteredFiles) {
    const filePath = file.name;
    const fullPath = `${path}/${filePath}`;

    if (file.isDirectory()) {
      files[filePath] = await processDirectory(fullPath, options);
    } else if (options.followLinks && file.isSymbolicLink()) {
      files[filePath] = symlink(await readlink(fullPath));
    } else {
      files[filePath] = await readFile(fullPath, options.getEncodingForFile(fullPath));
    }
  }

  return files;
}

/**
 * Recursively processes a directory and returns its structure as a JSON object.
 *
 * @param {string} path - The absolute path to the directory to process
 * @param {Required<Omit<FromFileSystemOptions, "extras">>} options - Configuration options for processing the directory
 *
 * @returns {DirectoryJSON} A DirectoryJSON object representing the directory structure where:
 * - Keys are file/directory names
 * - Values are either:
 *   - String content for files
 *   - Nested DirectoryJSON objects for directories
 *   - Symlink objects for symbolic links (when followLinks is true)
 * - Special key [FIXTURE_ORIGINAL_PATH] contains the normalized original path
 */
function processDirectorySync(
  path: string,
  options: Required<Omit<FromFileSystemOptions, "extras">>,
): DirectoryJSON {
  const files: DirectoryJSON = {
    [FIXTURE_ORIGINAL_PATH]: normalize(path),
  };

  const dirFiles = readdirSync(path, {
    withFileTypes: true,
  });

  const filteredFiles = dirFiles.filter((file) => !options.ignore.includes(file.name));

  for (const file of filteredFiles) {
    const filePath = file.name;
    const fullPath = `${path}/${filePath}`;

    if (file.isDirectory()) {
      files[filePath] = processDirectorySync(fullPath, options);
    } else if (options.followLinks && file.isSymbolicLink()) {
      files[filePath] = symlink(readlinkSync(fullPath));
    } else {
      files[filePath] = readFileSync(fullPath, options.getEncodingForFile(fullPath));
    }
  }

  return files;
}

/**
 * Recursively reads a directory and returns a JSON representation of its structure
 *
 * @param {string} path - The path to the directory to read
 * @param {FromFileSystemOptions?} options - Options for customizing the directory reading behavior
 *
 * @returns {Promise<DirectoryJSON>} A promise that resolves to a DirectoryJSON object representing the directory structure
 * @throws Will throw an error if the path cannot be accessed or read
 *
 * @example
 * ```ts
 * const dirStructure = await fromFileSystem('./src', {
 *   ignore: ['node_modules', '.git'],
 *   followLinks: false
 * });
 * ```
 */
export async function fromFileSystem(
  path: string,
  options?: FromFileSystemOptions,
): Promise<DirectoryJSON> {
  if (!await isDirectory(path)) {
    return {};
  }

  const files = await processDirectory(path, {
    ignore: options?.ignore ?? [],
    followLinks: options?.followLinks ?? true,
    getEncodingForFile: options?.getEncodingForFile ?? DEFAULT_ENCODING_FOR_FILE_FN,
  });

  return {
    ...files,
    ...options?.extras,
  };
}

/**
 * Synchronously creates a DirectoryJSON object from a file system path.
 *
 * @param {string} path - The path to the directory to read
 * @param {FromFileSystemOptions?} options - Options for customizing the directory reading behavior
 *
 * @returns {DirectoryJSON} A DirectoryJSON object representing the directory structure
 * @throws Will throw an error if the path cannot be accessed or read
 *
 * @example
 * ```ts
 * const dirStructure = fromFileSystemSync('./src', {
 *   ignore: ['node_modules', '.git'],
 *   followLinks: false
 * });
 * ```
 */
export function fromFileSystemSync(
  path: string,
  options?: FromFileSystemOptions,
): DirectoryJSON {
  if (!isDirectorySync(path)) {
    return {};
  }

  const files = processDirectorySync(path, {
    ignore: options?.ignore ?? [],
    followLinks: options?.followLinks ?? true,
    getEncodingForFile: options?.getEncodingForFile ?? DEFAULT_ENCODING_FOR_FILE_FN,
  });

  return {
    ...files,
    ...options?.extras,
  };
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
