/**
 * VITE_MAJOR_VERSION に応じて Vite 6 / 7 / 8 を読み込む
 * （6 / 7 はエイリアスパッケージ vite6 / vite7、未指定時は最新の vite）
 */
export const loadVite = async (): Promise<typeof import('vite')> => {
  const major = process.env.VITE_MAJOR_VERSION
  const specifier = major === '6' ? 'vite6' : major === '7' ? 'vite7' : 'vite'
  return (await import(specifier)) as typeof import('vite')
}
