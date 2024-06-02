import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { fs } from 'memfs'
import { type Task, describe, expect, it, vi } from 'vitest'
import { getCurrentTest } from 'vitest/suite'
import { getDirNameFromTask, testdir } from '../src/utils'

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
  vi.mock('node:fs/promises', async () => {
    const memfs: { fs: typeof fs } = await vi.importActual('memfs')

    return memfs.fs.promises
  })

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

  // it('should cleanup the directory after the test has finished if cleanup option is true', async () => {
  //   const files = {
  //     'file.txt': 'content',
  //   }
  //   const dirname = await testdir(files, { cleanup: true })

  //   // Assert that the test directory is created
  //   expect(await readdir(dirname)).toEqual(['file.txt'])

  //   // Assert that the test directory is deleted
  //   await expect(readdir(dirname)).rejects.toThrow()
  // })

  // it('should throw an error if testdir is called outside of a test', async () => {
  //   const files = {
  //     'file.txt': 'content',
  //   }

  //   // Call testdir outside of a test
  //   await expect(testdir(files)).rejects.toThrow('testdir must be called inside a test')
  // })
})
