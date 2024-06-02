export type DirectoryContent = string | boolean | number | Uint8Array | null | undefined | bigint | symbol

export interface DirectoryJSON<T extends DirectoryContent = DirectoryContent> {
  [key: string]: T | DirectoryJSON<T>
}
