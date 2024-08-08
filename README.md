# package-manager-detector

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

Package manager detector is based on lock files and the `packageManager` field in the current project's `package.json` file.

It will detect your `yarn.lock` / `pnpm-lock.yaml` / `package-lock.json` / `bun.lockb` to know the current package manager and use the `packageManager` field in your `package.json` if present.

## Install

```sh
# pnpm
pnpm add package-manager-detector

# npm
npm i package-manager-detector

# yarn
yarn add package-manager-detector
```

## Usage

```js
// ESM
import { detect } from 'package-manager-detector'
```

```js
// CommonJS
const { detect } = require('package-manager-detector')
```

## Agents and Commands

This package includes package manager agents and their corresponding commands for:
- install dependencies
- install dependencies using frozen lockfile
- add dependencies
- remove dependencies
- install global packages
- remove global packages
- upgrade dependencies
- upgrade dependencies interactively: not available for `npm` and `bun`
- download & execute binary scripts
- run `package.json` scripts

### Using Agents and Commands

WIP

## License

[MIT](./LICENSE) License © 2020-PRESENT [Anthony Fu](https://github.com/antfu)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/package-manager-detector?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/package-manager-detector
[npm-downloads-src]: https://img.shields.io/npm/dm/package-manager-detector?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/package-manager-detector
[license-href]: https://github.com/userquin/package-manager-detector/blob/main/LICENSE
