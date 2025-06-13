const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const platform = process.platform
const arch = process.arch

const urls = {
  'darwin-x64':
    'https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic-0.15.0/tectonic-v0.15.0-x86_64-apple-darwin.tar.gz',
  'linux-x64':
    'https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic-0.15.0/tectonic-v0.15.0-x86_64-unknown-linux-gnu.tar.gz',
}

const key = `${platform}-${arch}`
const url = urls[key]
if (!url) {
  throw new Error(`Unsupported platform/arch: ${key}`)
}

const binDir = path.join(__dirname, '..', 'bin')
const binName = platform === 'linux' ? 'tectonic-linux' : 'tectonic'
const binPath = path.join(binDir, binName)

if (fs.existsSync(binPath)) {
  console.log(`Tectonic binary already exists at ${binPath}`)
  process.exit(0)
}

fs.mkdirSync(binDir, { recursive: true })
console.log(`Downloading Tectonic for ${key} from ${url}`)
execSync(`curl -L ${url} | tar -xz -C ${binDir}`)
fs.chmodSync(binPath, 0o755)
if (platform === 'darwin') {
  try {
    execSync(`xattr -c ${binPath}`)
  } catch (e) {
    console.warn('Failed to clear xattr:', e)
  }
}
console.log(`Tectonic installed at ${binPath}`)
