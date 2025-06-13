const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')
const platform = process.platform
const arch = process.arch

const urls = {
  'darwin-x64':
    'https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic@0.15.0/tectonic-0.15.0-x86_64-apple-darwin.tar.gz',
  'linux-x64':
    'https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic@0.15.0/tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz',
}

const key = `${platform}-${arch}`
const url = urls[key]
if (!url) {
  throw new Error(`Unsupported platform/arch: ${key}`)
}

const binDir = path.join(__dirname, '..', 'bin')
const binName = platform === 'linux' ? 'tectonic-linux' : 'tectonic'
const binPath = path.join(binDir, binName)
const tempFile = path.join(binDir, `tectonic-${key}.tar.gz`)

if (fs.existsSync(binPath)) {
  console.log(`Tectonic binary already exists at ${binPath}`)
  process.exit(0)
}

fs.mkdirSync(binDir, { recursive: true })

function downloadFile(url, dest, retries = 3) {
  return new Promise((resolve, reject) => {
    let attempt = 0
    const tryDownload = (currentUrl) => {
      attempt++
      console.log(`Attempt ${attempt}: Downloading Tectonic from ${currentUrl}`)
      const file = fs.createWriteStream(dest)

      const client = currentUrl.startsWith('https:') ? https : http

      client
        .get(
          currentUrl,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'application/octet-stream',
            },
          },
          (res) => {
            // Handle redirects
            if (
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              file.close()
              fs.unlinkSync(dest)
              console.log(`Redirecting to: ${res.headers.location}`)
              tryDownload(res.headers.location)
              return
            }

            if (res.statusCode >= 400) {
              file.close()
              if (fs.existsSync(dest)) {
                fs.unlinkSync(dest)
              }
              if (attempt < retries) {
                console.log(`HTTP ${res.statusCode}, retrying...`)
                setTimeout(() => tryDownload(url), 1000)
                return
              }
              reject(
                new Error(`HTTP ${res.statusCode} after ${retries} attempts`)
              )
              return
            }

            console.log(`Response status: ${res.statusCode}`)
            console.log(`Content-Length: ${res.headers['content-length']}`)

            res.pipe(file)
            file.on('finish', () => {
              file.close()
              const stats = fs.statSync(dest)
              console.log(`Downloaded file size: ${stats.size} bytes`)
              if (stats.size < 1000000) {
                // ~1MB minimum
                fs.unlinkSync(dest)
                if (attempt < retries) {
                  console.log(
                    `File too small (${stats.size} bytes), retrying...`
                  )
                  setTimeout(() => tryDownload(url), 1000)
                  return
                }
                reject(
                  new Error(`Downloaded file too small (${stats.size} bytes)`)
                )
                return
              }
              resolve()
            })
          }
        )
        .on('error', (err) => {
          file.close()
          if (fs.existsSync(dest)) {
            fs.unlinkSync(dest)
          }
          if (attempt < retries) {
            console.log(`Download error: ${err.message}, retrying...`)
            setTimeout(() => tryDownload(url), 1000)
            return
          }
          reject(err)
        })
    }
    tryDownload(url)
  })
}

async function installTectonic() {
  try {
    await downloadFile(url, tempFile)
    console.log(`Extracting ${tempFile} to ${binDir}`)
    execSync(`tar -xzf "${tempFile}" -C "${binDir}"`)

    // The extracted binary is just named 'tectonic', rename it if needed
    const extractedBinary = path.join(binDir, 'tectonic')
    if (binName !== 'tectonic' && fs.existsSync(extractedBinary)) {
      fs.renameSync(extractedBinary, binPath)
    }

    fs.unlinkSync(tempFile)
    fs.chmodSync(binPath, 0o755)

    if (platform === 'darwin') {
      try {
        execSync(`xattr -c "${binPath}"`)
      } catch (e) {
        console.warn('Failed to clear xattr:', e)
      }
    }
    console.log(`Tectonic installed at ${binPath}`)
  } catch (err) {
    console.error('Installation failed:', err)
    console.error('Please download the Tectonic binary manually from:')
    console.error(url)
    console.error(`Extract it to ${binDir} and name it ${binName}`)
    process.exit(1)
  }
}

installTectonic()
