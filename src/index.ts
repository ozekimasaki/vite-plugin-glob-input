import { resolve } from 'node:path'
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

/**
 * ファイルパスをrollupの入力形式に変換する関数
 */
function convertFilesToInput(
  options: Required<VitePluginGlobInputOptions>,
  config: ResolvedConfig,
  input: Record<string, string>,
  targetFiles: string[]
): Record<string, string> {
  const updatedInput = { ...input }

  for (const targetFile of targetFiles) {
    const relativePath = resolve(config.root, targetFile)
    const parsedPath = resolve(relativePath)
    const relativeToRoot = resolve(config.root)
    
    // ファイルパスの正規化
    const normalizedPath = resolve(parsedPath).replace(resolve(relativeToRoot), '')
    const pathParts = normalizedPath.split('/').filter(Boolean)
    
    if (pathParts.length === 1) {
      // ルートディレクトリのファイル
      const fileName = pathParts[0].replace(/\.[^/.]+$/, '') // 拡張子を除去
      if (fileName === 'index') {
        updatedInput[options.homeAlias] = targetFile
      } else {
        updatedInput[`${options.rootPrefix}${options.filePrefix}${fileName}`] = targetFile
      }
    } else {
      // サブディレクトリのファイル
      const dirPath = pathParts.slice(0, -1).join(options.dirDelimiter)
      const fileName = pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, '')
      
      if (fileName === 'index') {
        updatedInput[dirPath] = targetFile
      } else {
        updatedInput[`${dirPath}${options.filePrefix}${fileName}`] = targetFile
      }
    }
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
  userOptions: VitePluginGlobInputOptions
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

    options(rollupOptions) {
      // fast-globに必要なオプションを設定
      const globOptions: FastGlob.Options = {
        ...options.options,
        absolute: true,
      }

      try {
        // パターンにマッチするファイルを取得
        const targetFiles = fg.sync(options.patterns, globOptions)
        
        if (targetFiles.length === 0) {
          console.warn(`[vite-plugin-glob-input] No files found matching pattern: ${options.patterns}`)
          return rollupOptions
        }

        // 入力設定を処理
        let { input } = rollupOptions
        
        if (!input || typeof input === 'string') {
          input = options.disableAlias ? [] : {}
        }

        if (Array.isArray(input)) {
          // 配列形式の場合はファイルを追加
          rollupOptions.input = [...input, ...targetFiles]
        } else {
          // オブジェクト形式の場合はエイリアスを生成
          rollupOptions.input = convertFilesToInput(
            options,
            resolvedConfig,
            input,
            targetFiles
          )
        }

      } catch (error) {
        console.error('[vite-plugin-glob-input] Error processing glob patterns:', error)
        throw error
      }

      return rollupOptions
    },
  }
}

// 型互換性のために以前のインターフェース名もエクスポート
/** @deprecated Use VitePluginGlobInputOptions instead */
export type UserSettings = VitePluginGlobInputOptions
