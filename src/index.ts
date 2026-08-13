import path from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
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

/**
 * ファイルパスをrollupの入力形式に変換する関数
 */
function convertFilesToInput(
  options: Required<VitePluginGlobInputOptions>,
  config: ResolvedConfig,
  input: Record<string, string>,
  targetFiles: string[],
): Record<string, string> {
  const updatedInput = { ...input }

  for (const targetFile of targetFiles) {
    const absoluteFile = path.resolve(targetFile)
    const relativePath = path.relative(config.root, absoluteFile)
    const alias = toInputAlias(relativePath, options)
    updatedInput[alias] = targetFile
  }

  return updatedInput
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

  let resolvedConfig: ResolvedConfig

  return {
    name: 'vite-plugin-glob-input',
    enforce: 'pre',
    apply: 'build',

    configResolved(config) {
      resolvedConfig = config
    },

    async options(rollupOptions) {
      const globOptions: FastGlob.Options = {
        ...options.options,
        absolute: true,
      }

      try {
        const targetFiles = await fg(options.patterns, globOptions)

        if (targetFiles.length === 0) {
          const patternLabel = Array.isArray(options.patterns)
            ? options.patterns.join(', ')
            : options.patterns
          this.warn(`No files found matching pattern: ${patternLabel}`)
          return rollupOptions
        }

        let { input } = rollupOptions

        if (!input || typeof input === 'string') {
          input = options.disableAlias ? [] : {}
        }

        if (Array.isArray(input)) {
          rollupOptions.input = [...input, ...targetFiles]
        } else {
          rollupOptions.input = convertFilesToInput(
            options,
            resolvedConfig,
            input,
            targetFiles,
          )
        }
      } catch (error) {
        this.error(
          `[vite-plugin-glob-input] Error processing glob patterns: ${String(error)}`,
        )
      }

      return rollupOptions
    },
  }
}

// 型互換性のために以前のインターフェース名もエクスポート
/** @deprecated Use VitePluginGlobInputOptions instead */
export type UserSettings = VitePluginGlobInputOptions
