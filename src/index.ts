/**
 * Vitest Testdirs - A utility to create a temporary directory with files and directories for testing.
 * @module index
 *
 * @example
 * ```ts
 * import { testdir } from "vitest-testdirs";
 *
 * const dir = await testdir({
 *   nested: {
 *     "file.txt": "Hello, World!",
 *   },
 * });
 *
 * console.log(dir);
 * ```
 */

import type { DirectoryJSON, FromFileSystemOptions } from "./types";
import { linkSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import {
  link,
  mkdir,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  join,
  normalize,
  sep as pathSeparator,
  resolve,
} from "node:path";
import {
  afterAll,
  onTestFinished,
} from "vitest";
import {
  getCurrentSuite,
  getCurrentTest,
} from "vitest/suite";
import { BASE_DIR, FIXTURE_METADATA_SYMBOL, FIXTURE_ORIGINAL_PATH_SYMBOL } from "./constants";
import { hasMetadata, isLink, isPrimitive, isSymlink } from "./helpers";
import { createDirnameFromTask, isDirectory, isDirectorySync, isInVitest, processDirectory, processDirectorySync } from "./utils";

export * from "./constants";
export * from "./helpers";

/**
 * Options for creating a test directory.
 */
export interface TestdirOptions {
  /**
   * Whether to cleanup the directory after the test has finished.
   * @default true
   */
  cleanup?: boolean;

  /**
   * The directory name to use.
   *
   * If not provided, a directory name will be generated based on the test name.
   */
  dirname?: string;

  /**
   * Whether to allow the directory to be created outside of the `.vitest-testdirs` directory.
   *
   * WARN:
   * This can be dangerous as it can delete files, folders, etc. where it shouldn't.
   * Use with caution.
   *
   * @default false
   */
  allowOutside?: boolean;
}

/**
 * Creates a test directory with the specified files and options.
 *
 * @param {DirectoryJSON} files - The directory structure to create.
 * @param {TestdirOptions?} options - The options for creating the test directory.
 * @returns {Promise<string>} The path of the created test directory.
 * @throws An error if `testdir` is called outside of a test.
 */
export async function testdir(
  files: DirectoryJSON,
  options?: TestdirOptions,
): Promise<string> {
  if (!isInVitest()) {
    throw new Error("testdir must be called inside vitest context");
  }

  const test = getCurrentTest();
  const suite = getCurrentSuite();

  const dirname = options?.dirname
    ? normalize(join(BASE_DIR, options.dirname))
    : normalize(join(BASE_DIR, createDirnameFromTask(
        (test?.type === "test" ? test : suite) || suite,
      )));

  const allowOutside = options?.allowOutside ?? false;

  // if the dirname is escaped from BASE_DIR, throw an error
  if (!allowOutside && !dirname.startsWith(BASE_DIR)) {
    throw new Error(`The directory name must start with '${BASE_DIR}'`);
  }

  await createFileTree(dirname, files!);

  if (options?.cleanup ?? true) {
    if (test != null) {
      onTestFinished(async () => {
        await rm(dirname, {
          recursive: true,
          force: true,
        });
      });
    } else if (suite != null) {
      afterAll(async () => {
        await rm(dirname, {
          recursive: true,
          force: true,
        });
      });
    } else {
      throw new Error("testdir must be called inside vitest context");
    }
  }

  return dirname;
}

/**
 * Creates a test directory with the specified files and options.
 *
 * @param {DirectoryJSON} files - The directory structure to create.
 * @param {TestdirOptions?} options - The options for creating the test directory.
 * @returns {string} The path of the created test directory.
 * @throws An error if `testdir` is called outside of a test.
 */
export function testdirSync(
  files: DirectoryJSON,
  options?: TestdirOptions,
): string {
  if (!isInVitest()) {
    throw new Error("testdir must be called inside vitest context");
  }

  const test = getCurrentTest();
  const suite = getCurrentSuite();

  const dirname = options?.dirname
    ? normalize(join(BASE_DIR, options.dirname))
    : normalize(join(BASE_DIR, createDirnameFromTask(
        (test?.type === "test" ? test : suite) || suite,
      )));

  const allowOutside = options?.allowOutside ?? false;

  // if the dirname is escaped from BASE_DIR, throw an error
  if (!allowOutside && !dirname.startsWith(BASE_DIR)) {
    throw new Error(`The directory name must start with '${BASE_DIR}'`);
  }

  createFileTreeSync(dirname, files!);

  if (options?.cleanup ?? true) {
    if (test != null) {
      onTestFinished(() => {
        rmSync(dirname, {
          recursive: true,
          force: true,
        });
      });
    } else if (suite != null) {
      afterAll(() => {
        rmSync(dirname, {
          recursive: true,
          force: true,
        });
      });
    } else {
      throw new Error("testdir must be called inside vitest context");
    }
  }

  return dirname;
}

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
    const metadata = hasMetadata(data) ? data[FIXTURE_METADATA_SYMBOL] : undefined;
    data = hasMetadata(data) ? data.content : data;

    filename = resolve(path, filename);

    // check if file is a object with the link symbol
    if (isLink(data)) {
      await link(resolve(dirname(filename), data.path), filename);
      continue;
    }

    if (isSymlink(data)) {
      if (files[FIXTURE_ORIGINAL_PATH_SYMBOL] != null) {
        const original = normalize(files[FIXTURE_ORIGINAL_PATH_SYMBOL]);

        // we need to replace here due to the fact that we call `createFileTree` recursively,
        // and when we do it with a nested directory, the path is now the full path, and not just the relative path.
        const tmpPath = normalize(path.replace(
          // eslint-disable-next-line node/prefer-global/process
          `${process.cwd()}${pathSeparator}`,
          "",
        ));

        const pathLevels = tmpPath.split(/[/\\]/).filter(Boolean).length;
        const originalLevels = original.split(/[/\\]/).filter(Boolean).length;

        if (pathLevels < originalLevels) {
          const diff = originalLevels - pathLevels;
          data.path = data.path.replace(`..${pathSeparator}`.repeat(diff), "");
        } else if (pathLevels > originalLevels) {
          const diff = pathLevels - originalLevels;
          data.path = `..${pathSeparator}`.repeat(diff) + data.path;
        }
      }

      await symlink(
        data.path,
        filename,
        await isDirectory(filename) ? "junction" : "file",
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

      await writeFile(filename, data, {
        ...metadata,
      });
    } else {
      await mkdir(filename, {
        recursive: true,
        ...(metadata?.mode ? { mode: metadata.mode } : {}),
      });

      await createFileTree(filename, data as DirectoryJSON);
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
    const metadata = hasMetadata(data) ? data[FIXTURE_METADATA_SYMBOL] : undefined;
    data = hasMetadata(data) ? data.content : data;

    filename = resolve(path, filename);

    // check if file is a object with the link symbol
    if (isLink(data)) {
      linkSync(resolve(dirname(filename), data.path), filename);
      continue;
    }

    if (isSymlink(data)) {
      if (files[FIXTURE_ORIGINAL_PATH_SYMBOL] != null) {
        const original = normalize(files[FIXTURE_ORIGINAL_PATH_SYMBOL]);

        // we need to replace here due to the fact that we call `createFileTree` recursively,
        // and when we do it with a nested directory, the path is now the full path, and not just the relative path.
        const tmpPath = normalize(path.replace(
          // eslint-disable-next-line node/prefer-global/process
          `${process.cwd()}${pathSeparator}`,
          "",
        ));

        const pathLevels = tmpPath.split(/[/\\]/).filter(Boolean).length;
        const originalLevels = original.split(/[/\\]/).filter(Boolean).length;

        if (pathLevels < originalLevels) {
          const diff = originalLevels - pathLevels;
          data.path = data.path.replace(`..${pathSeparator}`.repeat(diff), "");
        } else if (pathLevels > originalLevels) {
          const diff = pathLevels - originalLevels;
          data.path = `..${pathSeparator}`.repeat(diff) + data.path;
        }
      }

      symlinkSync(
        data.path,
        filename,
        isDirectorySync(filename) ? "junction" : "file",
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

      writeFileSync(filename, data, {
        ...metadata,
      });
    } else {
      mkdirSync(filename, {
        recursive: true,
        ...(metadata?.mode ? { mode: metadata.mode } : {}),
      });

      createFileTreeSync(filename, data as DirectoryJSON);
    }
  }
}

const DEFAULT_ENCODING_FOR_FILE_FN = () => "utf-8" as BufferEncoding;

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
