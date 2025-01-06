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

import type { DirectoryJSON } from "./types";
import { link, mkdir, readdir, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
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
import { FIXTURE_ORIGINAL_PATH } from "./";
import {
  BASE_DIR,
  FIXTURE_METADATA,
} from "./constants";

import {
  createDirnameFromTask,
  hasMetadata,
  isDirectory,
  isLink,
  isPrimitive,
  isSymlink,
  symlink as symlinkFn,
} from "./utils";

export * from "./constants";
export * from "./utils";

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
    onTestFinished(async () => {
      await rm(dirname, {
        recursive: true,
      });
    });
  }

  if (options?.cleanup ?? true) {
    if (getCurrentTest() != null) {
      onTestFinished(async () => {
        await rm(dirname, {
          recursive: true,
          force: true,
        });
      });
    } else if (getCurrentSuite() != null) {
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
    const metadata = hasMetadata(data) ? data[FIXTURE_METADATA] : undefined;
    data = hasMetadata(data) ? data.content : data;

    filename = resolve(path, filename);

    // check if file is a object with the link symbol
    if (isLink(data)) {
      await link(resolve(dirname(filename), data.path), filename);
      continue;
    }

    if (isSymlink(data)) {
      if (files[FIXTURE_ORIGINAL_PATH] != null) {
        const original = normalize(files[FIXTURE_ORIGINAL_PATH]);

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
        // isDir(filename, data.path) ? "junction" : "file",
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

function isInVitest(): boolean {
  return getCurrentSuite() != null || getCurrentTest() != null;
}

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
      files[filePath] = symlinkFn(await readlink(fullPath));
    } else {
      files[filePath] = await readFile(fullPath, options.getEncodingForFile(fullPath));
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
