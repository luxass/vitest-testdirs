import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'
import type { fs } from 'memfs'
import { type Task, afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { getCurrentTest } from 'vitest/suite'
import { getDirNameFromTask, testdir, testdirSync } from '../src/utils'

vi.mock('node:fs/promises', async () => {
  const memfs: { fs: typeof fs } = await vi.importActual('memfs')

  return memfs.fs.promises
})

vi.mock('node:fs', async () => {
  const memfs: { fs: typeof fs } = await vi.importActual('memfs')

  return memfs.fs
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getDirNameFromTask', () => {
  it('should return the correct directory name for a task using \'getCurrentTest\'', () => {
    const dirName = getDirNameFromTask(getCurrentTest()!)

    expect(dirName).toBe('vitest-utils-getDirNameFromTask-should-return-the-correct-directory-name-for-a-task-using-getCurrentTest')
  })

  it('should use \'unnamed\' as the file name if the task does not have a file name', () => {
    const task = {
      file: {},
      name: 'should use \'unnamed\' as the file name if the task does not have a file name',
      suite: { name: 'utils' },
    } as Task

    const dirName = getDirNameFromTask(task)

    expect(dirName).toBe('vitest-unnamed-utils-should-use-unnamed-as-the-file-name-if-the-task-does-not-have-a-file-name')
  })

  it('should include suite name in the directory name', () => {
    const task = {
      file: {},
      name: 'should include suite name in the directory name',
      suite: { name: 'utils' },
    } as Task

    const dirName = getDirNameFromTask(task)

    expect(dirName).toBe('vitest-unnamed-utils-should-include-suite-name-in-the-directory-name')
  })

  it('should remove \'.test.ts\' from the file name', () => {
    const task = {
      file: { name: 'utils.test.ts' },
      name: 'should remove \'.test.ts\' from the file name',
    } as Task

    const dirName = getDirNameFromTask(task)

    expect(dirName).toBe('vitest-utils-should-remove-test-ts-from-the-file-name')
  })

  it('should replace non-alphanumeric characters with \'-\'', () => {
    const task = {
      file: { name: 'utils.test.ts' },
      name: 'should replace ........ æøå non-alphanumeric characters with \'-\'',
    } as Task

    const dirName = getDirNameFromTask(task)

    expect(dirName).toBe('vitest-utils-should-replace-non-alphanumeric-characters-with')
  })

  it('should replace trailing hyphens with nothing', () => {
    const task = {
      file: { name: 'utils.test.ts' },
      name: 'should replace trailing hyphens with nothing-',
    } as Task

    const dirName = getDirNameFromTask(task)

    expect(dirName).toBe('vitest-utils-should-replace-trailing-hyphens-with-nothing')
  })

  it('should replace multiple hyphens with a single hyphen', () => {
    const task = {
      file: { name: 'utils.test.ts' },
      name: 'should replace multiple---hyphens with a single hyphen---',
    } as Task

    const dirName = getDirNameFromTask(task)

    expect(dirName).toBe('vitest-utils-should-replace-multiple-hyphens-with-a-single-hyphen')
  })
})

describe('testdir', () => {
  it('should create a test directory with the specified files', async () => {
    const files = {
      'file1.txt': 'content1',
      'file2.txt': 'content2',
      'subdir': {
        'file3.txt': 'content3',
      },
    }

    const dirname = await testdir(files)

    expect(await readdir(dirname)).toEqual(['file1.txt', 'file2.txt', 'subdir'])
    expect(await readdir(join(dirname, 'subdir'))).toEqual(['file3.txt'])
    expect(await readFile(join(dirname, 'file1.txt'), 'utf8')).toBe('content1')
    expect(await readFile(join(dirname, 'file2.txt'), 'utf8')).toBe('content2')
    expect(await readFile(join(dirname, 'subdir', 'file3.txt'), 'utf8')).toBe('content3')
  })

  it('should generate a directory name based on the test name if dirname is not provided', async () => {
    const files = {
      'file.txt': 'content',
    }

    const dirname = await testdir(files)
    expect(dirname).toBe('.vitest-testdirs/vitest-utils-testdir-should-generate-a-directory-name-based-on-the-test-name-if-dirname-is-not-provided')
  })

  it('should generate a directory name based on the provided dirname', async () => {
    const files = {
      'file.txt': 'content',
    }

    const dirname = await testdir(files, { dirname: 'custom-dirname' })
    expect(dirname).toBe('.vitest-testdirs/custom-dirname')
  })

  it('should cleanup the directory after the test has finished if cleanup option is true', async () => {
    const files = {
      'file.txt': 'content',
    }

    // we need to have the onTestFinished callback before calling testdir
    // otherwise the order that they are called is testdir first, and then ours.
    // which means that our onTestFinished callback will be called before the one from testdir
    onTestFinished(() => {
      const dirname = getDirNameFromTask(getCurrentTest()!)
      expect(readdir(dirname)).rejects.toThrow()
    })

    const dirname = await testdir(files, { cleanup: true })
    expect(await readdir(dirname)).toEqual(['file.txt'])
  })

  it('should allow the directory to be created outside of the `.vitest-testdirs` directory if allowOutside is true', async () => {
    const files = {
      'file.txt': 'content',
    }

    const dirname = await testdir(files, { allowOutside: true })
    expect(await readdir(dirname)).toEqual(['file.txt'])
  })

  it('should throw error if directory will be created outside of `.vitest-testdirs` by default', async () => {
    const files = {
      'file.txt': 'content',
    }

    await expect(testdir(files, {
      dirname: '../testdir',
    })).rejects.toThrowError('The directory name must start with \'.vitest-testdirs\'')
  })
})

describe('testdirSync', () => {
  it('should create a test directory with the specified files', () => {
    const files = {
      'file1.txt': 'content1',
      'file2.txt': 'content2',
      'subdir': {
        'file3.txt': 'content3',
      },
    }

    const dirname = testdirSync(files)

    expect(readdirSync(dirname)).toEqual(['file1.txt', 'file2.txt', 'subdir'])
    expect(readdirSync(join(dirname, 'subdir'))).toEqual(['file3.txt'])
    expect(readFileSync(join(dirname, 'file1.txt'), 'utf8')).toBe('content1')
    expect(readFileSync(join(dirname, 'file2.txt'), 'utf8')).toBe('content2')
    expect(readFileSync(join(dirname, 'subdir', 'file3.txt'), 'utf8')).toBe('content3')
  })

  it('should generate a directory name based on the test name if dirname is not provided', () => {
    const files = {
      'file.txt': 'content',
    }

    const dirname = testdirSync(files)
    expect(dirname).toBe('.vitest-testdirs/vitest-utils-testdirSync-should-generate-a-directory-name-based-on-the-test-name-if-dirname-is-not-provided')
  })

  it('should generate a directory name based on the provided dirname', () => {
    const files = {
      'file.txt': 'content',
    }

    const dirname = testdirSync(files, { dirname: 'custom-dirname' })
    expect(dirname).toBe('.vitest-testdirs/custom-dirname')
  })

  it('should cleanup the directory after the test has finished if cleanup option is true', () => {
    const files = {
      'file.txt': 'content',
    }

    // we need to have the onTestFinished callback before calling testdir
    // otherwise the order that they are called is testdir first, and then ours.
    // which means that our onTestFinished callback will be called before the one from testdir
    onTestFinished(() => {
      const dirname = getDirNameFromTask(getCurrentTest()!)
      expect(readdir(dirname)).rejects.toThrow()
    })

    const dirname = testdirSync(files, { cleanup: true })
    expect(readdirSync(dirname)).toEqual(['file.txt'])
  })

  it('should allow the directory to be created outside of the `.vitest-testdirs` directory if allowOutside is true', () => {
    const files = {
      'file.txt': 'content',
    }

    const dirname = testdirSync(files, { allowOutside: true })
    expect(readdirSync(dirname)).toEqual(['file.txt'])
  })

  it('should throw error if directory will be created outside of `.vitest-testdirs` by default', () => {
    const files = {
      'file.txt': 'content',
    }

    expect(() => testdirSync(files, {
      dirname: '../testdir',
    })).toThrowError('The directory name must start with \'.vitest-testdirs\'')
  })
})
