import path from 'node:path'
import type { Plugin } from 'vite'
import type FastGlob from 'fast-glob'
import fg from 'fast-glob'

/**
 * プラグインの設定オプション
 */
export interface VitePluginGlobInputOptions {
  /** ファイルを検索するためのglobパターン */
  patterns: FastGlob.Pattern | FastGlob.Pattern[]
  /** fast-globのオプション */
  options?: FastGlob.Options
  /** エイリアス機能を無効にするかどうか */
  disableAlias?: boolean
  /** ホームページのエイリアス名 */
  homeAlias?: string
  /** ルートファイルの接頭辞 */
  rootPrefix?: string
  /** ディレクトリ区切り文字 */
  dirDelimiter?: string
  /** ファイル接頭辞 */
  filePrefix?: string
}

/**
 * デフォルト設定
 */
const DEFAULT_OPTIONS: Required<VitePluginGlobInputOptions> = {
  patterns: '**/*.html',
  options: {},
  disableAlias: false,
  homeAlias: 'home',
  rootPrefix: 'root',
  dirDelimiter: '-',
  filePrefix: '_',
} as const

const stripExtension = (fileName: string): string =>
  fileName.replace(/\.[^/.]+$/, '')

const toPosixPath = (filePath: string): string => filePath.replace(/\\/g, '/')

const normalizePattern = (pattern: FastGlob.Pattern): FastGlob.Pattern =>
  typeof pattern === 'string' ? toPosixPath(pattern) : pattern

const sameResolvedPath = (left: string, right: string): boolean => {
  const a = toPosixPath(path.resolve(left))
  const b = toPosixPath(path.resolve(right))
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

const isClientEnvironment = (environment: {
  name: string
  consumer?: string
}): boolean => environment.consumer === 'client' || environment.name === 'client'

/**
 * ルートからの相対パスを rollup input のキーに変換する
 */
export function toInputAlias(
  relativePath: string,
  options: Pick<
    Required<VitePluginGlobInputOptions>,
    'homeAlias' | 'rootPrefix' | 'dirDelimiter' | 'filePrefix'
  >,
): string {
  const pathParts = relativePath.split(/[\\/]/).filter(Boolean)
  const fileName = stripExtension(pathParts.at(-1) ?? '')

  if (pathParts.length <= 1) {
    return fileName === 'index'
      ? options.homeAlias
      : `${options.rootPrefix}${options.filePrefix}${fileName}`
  }

  const dirPath = pathParts.slice(0, -1).join(options.dirDelimiter)
  return fileName === 'index'
    ? dirPath
    : `${dirPath}${options.filePrefix}${fileName}`
}

type GlobbedInput = {
  files: string[]
  input: string[] | Record<string, string>
  collisions: string[]
}

/**
 * ファイルパスをrollupの入力形式に変換する関数
 */
function convertFilesToInput(
  options: Required<VitePluginGlobInputOptions>,
  root: string,
  input: Record<string, string>,
  targetFiles: string[],
): { input: Record<string, string>; collisions: string[] } {
  const updatedInput = { ...input }
  const collisions: string[] = []

  for (const targetFile of targetFiles) {
    const absoluteFile = toPosixPath(path.resolve(targetFile))
    const relativePath = path.relative(root, absoluteFile)
    const alias = toInputAlias(relativePath, options)
    const existing = updatedInput[alias]
    if (existing && !sameResolvedPath(existing, absoluteFile)) {
      collisions.push(alias)
    }
    updatedInput[alias] = absoluteFile
  }

  return { input: updatedInput, collisions }
}

function mergeRollupInput(
  current: unknown,
  globbed: GlobbedInput,
  disableAlias: boolean,
): string[] | Record<string, string> {
  if (!current || typeof current === 'string') {
    return globbed.input
  }

  if (Array.isArray(current)) {
    const extra = globbed.files.filter(
      (file) => !current.some((item) => sameResolvedPath(item, file)),
    )
    return [...current, ...extra]
  }

  if (disableAlias) {
    return globbed.input
  }

  return {
    ...(current as Record<string, string>),
    ...(globbed.input as Record<string, string>),
  }
}

/**
 * Vite plugin for glob-based input configuration
 *
 * @param userOptions - ユーザー指定のオプション
 * @returns Vite plugin
 */
export default function vitePluginGlobInput(
  userOptions: VitePluginGlobInputOptions,
): Plugin {
  const options: Required<VitePluginGlobInputOptions> = {
    ...DEFAULT_OPTIONS,
    ...userOptions,
    options: {
      ...DEFAULT_OPTIONS.options,
      ...userOptions.options,
    },
  }

  let resolvedRoot = ''
  let globbed: GlobbedInput | undefined
  let emptyWarning: string | undefined
  let globError: unknown

  const ensureGlob = async (root: string): Promise<GlobbedInput> => {
    if (globbed) {
      return globbed
    }

    const globOptions: FastGlob.Options = {
      cwd: process.cwd(),
      onlyFiles: true,
      unique: true,
      ...options.options,
      absolute: true,
    }

    const rawPatterns = Array.isArray(options.patterns)
      ? options.patterns
      : [options.patterns]
    const files = (await fg(rawPatterns.map(normalizePattern), globOptions)).map(
      (file) => toPosixPath(path.resolve(file)),
    )
    if (files.length === 0) {
      const patternLabel = Array.isArray(options.patterns)
        ? options.patterns.join(', ')
        : options.patterns
      emptyWarning = `No files found matching pattern: ${patternLabel}`
      globbed = { files, input: options.disableAlias ? [] : {}, collisions: [] }
      return globbed
    }

    if (options.disableAlias) {
      globbed = { files, input: files, collisions: [] }
      return globbed
    }

    const converted = convertFilesToInput(options, root, {}, files)
    globbed = {
      files,
      input: converted.input,
      collisions: converted.collisions,
    }
    return globbed
  }

  return {
    name: 'vite-plugin-glob-input',
    enforce: 'pre',
    apply: 'build',

    applyToEnvironment(environment) {
      return isClientEnvironment(environment)
    },

    async config(config) {
      const root = path.resolve(config.root ?? '.')
      resolvedRoot = root
      try {
        const result = await ensureGlob(root)
        if (result.files.length === 0) {
          return
        }
        return {
          build: {
            rollupOptions: {
              input: result.input,
            },
          },
        }
      } catch (error) {
        globError = error
        throw new Error(
          `[vite-plugin-glob-input] Error processing glob patterns: ${String(error)}`,
        )
      }
    },

    configResolved(config) {
      resolvedRoot = config.root
    },

    async options(rollupOptions) {
      if (globError) {
        this.error(
          `[vite-plugin-glob-input] Error processing glob patterns: ${String(globError)}`,
        )
      }

      try {
        const result = await ensureGlob(resolvedRoot || path.resolve('.'))
        if (result.files.length === 0) {
          return rollupOptions
        }
        rollupOptions.input = mergeRollupInput(
          rollupOptions.input,
          result,
          options.disableAlias,
        )
      } catch (error) {
        this.error(
          `[vite-plugin-glob-input] Error processing glob patterns: ${String(error)}`,
        )
      }

      return rollupOptions
    },

    buildStart() {
      if (emptyWarning) {
        this.warn(emptyWarning)
      }
      if (globbed && globbed.collisions.length > 0) {
        this.warn(
          `Duplicate input aliases: ${globbed.collisions.join(', ')}. Later files overwrite earlier ones.`,
        )
      }
    },
  }
}

// 型互換性のために以前のインターフェース名もエクスポート
/** @deprecated Use VitePluginGlobInputOptions instead */
export type UserSettings = VitePluginGlobInputOptions
