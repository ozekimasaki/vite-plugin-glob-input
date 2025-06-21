# vite-plugin-glob-input

[![npm version](https://img.shields.io/npm/v/vite-plugin-glob-input.svg)](https://www.npmjs.com/package/vite-plugin-glob-input)
[![license](https://img.shields.io/npm/l/vite-plugin-glob-input.svg)](https://github.com/ozekimasaki/vite-plugin-glob-input/blob/main/LICENSE)

Vite plugin to add files to `build.rollupOptions.input` using fast-glob patterns.

## Features

- 📦 **Vite 6+ Compatible**: Fully supports Vite 6 and later versions (including Vite 7 beta)
- 🔍 **Fast Glob Integration**: Uses fast-glob for efficient file pattern matching
- 🏷️ **Smart Aliasing**: Automatically generates meaningful entry names
- 📁 **Flexible Configuration**: Support for complex directory structures
- 🎯 **TypeScript First**: Built with TypeScript for better development experience

## Installation

```bash
npm install -D vite-plugin-glob-input
```

## Usage

### Basic Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import globInput from 'vite-plugin-glob-input'

export default defineConfig({
  plugins: [
    globInput({
      patterns: 'src/pages/**/*.html'
    })
  ]
})
```

### Advanced Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import globInput from 'vite-plugin-glob-input'

export default defineConfig({
  plugins: [
    globInput({
      patterns: ['src/pages/**/*.html', 'src/components/**/*.html'],
      options: {
        ignore: ['**/private/**', '**/_*'],
        absolute: false
      },
      disableAlias: false,
      homeAlias: 'main',
      rootPrefix: 'page',
      dirDelimiter: '-',
      filePrefix: '_'
    })
  ]
})
```

## Configuration Options

### `VitePluginGlobInputOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `patterns` | `string \| string[]` | - | **Required**. Glob patterns to match files |
| `options` | `FastGlob.Options` | `{}` | Options passed to fast-glob |
| `disableAlias` | `boolean` | `false` | Disable automatic alias generation |
| `homeAlias` | `string` | `'home'` | Alias name for index files in root |
| `rootPrefix` | `string` | `'root'` | Prefix for non-index files in root |
| `dirDelimiter` | `string` | `'-'` | Character to replace path separators |
| `filePrefix` | `string` | `'_'` | Prefix for non-index files |

### Fast-Glob Options

The `options` field accepts any [fast-glob options](https://github.com/mrmlnc/fast-glob#options-3). Common options include:

- `ignore`: Array of patterns to ignore
- `deep`: Maximum depth of directory traversal
- `onlyFiles`: Return only files (default: true)
- `case`: Case sensitive matching

## File Naming Convention

The plugin automatically generates entry aliases based on file paths:

| File Path | Generated Alias | Description |
|-----------|----------------|-------------|
| `src/index.html` | `home` | Root index file |
| `src/about.html` | `root_about` | Root non-index file |
| `src/blog/index.html` | `blog` | Directory index file |
| `src/blog/post.html` | `blog_post` | Directory non-index file |

### Custom Naming

```typescript
globInput({
  patterns: 'src/**/*.html',
  homeAlias: 'main',      // index.html → 'main'
  rootPrefix: 'page',     // about.html → 'page_about'
  dirDelimiter: '__',     // blog/post.html → 'blog__post'
  filePrefix: '--'        // blog/post.html → 'blog--post'
})
```

## Examples

### Static Site Generation

```typescript
// Generate entries for all pages
globInput({
  patterns: 'src/pages/**/*.html',
  options: {
    ignore: ['**/templates/**', '**/_*']
  }
})
```

### Multi-Entry Application

```typescript
// Multiple entry points for different sections
globInput({
  patterns: [
    'src/admin/**/*.html',
    'src/public/**/*.html'
  ]
})
```

### Disable Aliasing

```typescript
// Use file paths as-is
globInput({
  patterns: 'src/**/*.html',
  disableAlias: true
})
```

## Compatibility

- **Vite**: ^6.0.0 || ^7.0.0
- **Node.js**: 18.x, 20.x, 22.x
- **TypeScript**: 5.x

## Development

### Testing

This project uses Vitest 3.2 for testing:

```bash
# Run tests
npm test

# Run tests with coverage
npm run coverage

# Run tests in watch mode
npm run test:watch
```

### Building

```bash
# Build the package
npm run build

# Type check
npm run type-check
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v0.0.1

- ✨ Initial release
- ✨ Vite 7 beta support
- ✨ Vitest 3.2 integration
- 🔧 TypeScript configuration
- 🐛 Robust error handling
- 📝 Comprehensive documentation