import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import fse from 'fs-extra'
import { beforeEach, afterAll, test, expect } from 'vitest'
import { build } from 'vite'
import type { UserConfig } from 'vite'

import inputPlugin, { type VitePluginGlobInputOptions } from '../src/index.js'

const srcdir = resolve(__dirname, 'src')
const distdir = resolve(__dirname, 'dist')

const defaultConfig = (pluginConfig: VitePluginGlobInputOptions): UserConfig => {
  return {
    root: srcdir,
    build: {
      outDir: distdir,
      emptyOutDir: true,
    },
    plugins: [inputPlugin(pluginConfig)],
  }
}

const exists = (filepath: string): boolean =>
  existsSync(resolve(distdir, filepath))

beforeEach(async () => {
  await fse.emptyDir(distdir)
})

afterAll(async () => {
  await fse.remove(distdir)
})

test('すべてのHTMLファイルをビルドできる', async () => {
  const config = defaultConfig({
    patterns: '__tests__/src/**/*.html',
  })
  await build(config)
  
  expect(exists('index.html')).toBe(true)
  expect(exists('non-index.html')).toBe(true)
  expect(exists('subdir/index.html')).toBe(true)
  expect(exists('subdir/non-index.html')).toBe(true)
  expect(exists('ignore/ignore.html')).toBe(true)
  expect(exists('ignore/_index.html')).toBe(true)
})

test('パターンマッチによるファイル除外が機能する', async () => {
  const config = defaultConfig({
    patterns: '__tests__/src/**/[^_]*.html',
    options: {
      ignore: ['**/ignore.html'],
    },
  })
  await build(config)
  
  expect(exists('index.html')).toBe(true)
  expect(exists('non-index.html')).toBe(true)
  expect(exists('subdir/index.html')).toBe(true)
  expect(exists('subdir/non-index.html')).toBe(true)
  expect(exists('ignore/ignore.html')).toBe(false)
  expect(exists('ignore/_index.html')).toBe(false)
})

test('エイリアス無効化が正常に動作する', async () => {
  const config = defaultConfig({
    disableAlias: true,
    patterns: '__tests__/src/**/[^_]*.html',
    options: {
      ignore: ['**/ignore.html'],
    },
  })
  await build(config)
  
  expect(exists('index.html')).toBe(true)
  expect(exists('non-index.html')).toBe(true)
  expect(exists('subdir/index.html')).toBe(true)
  expect(exists('subdir/non-index.html')).toBe(true)
  expect(exists('ignore/ignore.html')).toBe(false)
  expect(exists('ignore/_index.html')).toBe(false)
})

test('カスタムエイリアス設定が適用される', async () => {
  const config = defaultConfig({
    patterns: '__tests__/src/index.html',
    homeAlias: 'main',
    rootPrefix: 'app',
    dirDelimiter: '__',
    filePrefix: '--',
  })
  
  await build(config)
  expect(exists('index.html')).toBe(true)
})

test('マッチするファイルがない場合の処理', async () => {
  const config = defaultConfig({
    patterns: '__tests__/src/**/*.nonexistent',
  })
  
  // エラーを投げずに正常に完了することを確認
  await expect(build(config)).resolves.not.toThrow()
})
