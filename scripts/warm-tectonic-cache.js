const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const platform = process.platform
const binName = platform === 'linux' ? 'tectonic-linux' : 'tectonic'
const TECTONIC_PATH = path.join(__dirname, '..', 'bin', binName)

// Sample LaTeX document that uses common packages that the resume template needs
const sampleLatex = `
\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape Sample Resume} \\\\ \\vspace{1pt}
    \\small sample@email.com $|$ 
    \\href{https://linkedin.com/in/sample}{\\underline{linkedin.com/in/sample}} $|$ 
    \\href{https://github.com/sample}{\\underline{github.com/sample}}
\\end{center}

\\section{Experience}
\\begin{itemize}[leftmargin=0.15in, label={}]
  \\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{Software Engineer} & Jan 2023 -- Present \\\\
      \\textit{\\small Tech Company} & \\textit{\\small San Francisco, CA} \\\\
    \\end{tabular*}\\vspace{-7pt}
    \\begin{itemize}
      \\item\\small{Developed applications using modern technologies\\vspace{-2pt}}
      \\item\\small{Collaborated with cross-functional teams\\vspace{-2pt}}
    \\end{itemize}\\vspace{-5pt}
\\end{itemize}

\\section{Projects}
\\begin{itemize}[leftmargin=0.15in, label={}]
  \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small\\textbf{Sample Project} $|$ \\emph{React, TypeScript, Node.js} & Jan 2023 -- Mar 2023 \\\\
    \\end{tabular*}\\vspace{-7pt}
    \\begin{itemize}
      \\item\\small{Built a full-stack application\\vspace{-2pt}}
    \\end{itemize}\\vspace{-5pt}
\\end{itemize}

\\end{document}
`

async function warmCache() {
  console.log('Warming Tectonic cache...')

  // Check if tectonic binary exists
  if (!fs.existsSync(TECTONIC_PATH)) {
    console.error('Tectonic binary not found. Run download-tectonic.js first.')
    process.exit(1)
  }

  // Create cache directories
  const cacheDir = path.join(os.tmpdir(), 'tectonic-build-cache')
  const xdgCacheDir = path.join(os.tmpdir(), 'xdg-build-cache')

  try {
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.mkdirSync(xdgCacheDir, { recursive: true })
  } catch (error) {
    console.warn('Warning: Could not create cache directories:', error.message)
  }

  return new Promise((resolve, reject) => {
    console.log('Compiling sample document to download common packages...')

    const tectonic = spawn(
      TECTONIC_PATH,
      ['-X', 'compile', '-', '--outdir', '/tmp'],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TECTONIC_CACHE_DIR: cacheDir,
          XDG_CACHE_HOME: xdgCacheDir,
        },
      }
    )

    let stdout = ''
    let stderr = ''

    tectonic.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    tectonic.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    tectonic.on('close', (code) => {
      if (code === 0) {
        console.log('Cache warming completed successfully!')
        console.log('Cache statistics:')

        // Show useful cache information
        try {
          // Count files in cache directories to show what was downloaded
          const tectonicFiles = fs.readdirSync(cacheDir, {
            recursive: true,
          }).length
          const xdgFiles = fs.readdirSync(xdgCacheDir, {
            recursive: true,
          }).length

          // Get directory sizes
          const getDirSize = (dir) => {
            try {
              const files = fs.readdirSync(dir, { recursive: true })
              return files.reduce((total, file) => {
                try {
                  const stats = fs.statSync(path.join(dir, file))
                  return total + (stats.isFile() ? stats.size : 0)
                } catch {
                  return total
                }
              }, 0)
            } catch {
              return 0
            }
          }

          const tectonicSize = getDirSize(cacheDir)
          const xdgSize = getDirSize(xdgCacheDir)

          console.log(`   Tectonic cache: ${cacheDir}`)
          console.log(
            `   - Files: ${tectonicFiles}, Size: ${Math.round(
              tectonicSize / 1024
            )}KB`
          )
          console.log(`   XDG cache: ${xdgCacheDir}`)
          console.log(
            `   - Files: ${xdgFiles}, Size: ${Math.round(xdgSize / 1024)}KB`
          )
          console.log(
            `   Total: ${tectonicFiles + xdgFiles} files, ${Math.round(
              (tectonicSize + xdgSize) / 1024
            )}KB`
          )
        } catch (e) {
          console.log(
            '   Cache directories created (unable to read detailed stats)'
          )
        }

        resolve()
      } else {
        console.error('Cache warming failed:')
        console.error('STDOUT:', stdout)
        console.error('STDERR:', stderr)
        reject(new Error(`Tectonic exited with code ${code}`))
      }
    })

    tectonic.on('error', (error) => {
      reject(error)
    })

    // Write the sample LaTeX document
    tectonic.stdin.write(sampleLatex)
    tectonic.stdin.end()
  })
}

if (require.main === module) {
  warmCache().catch((error) => {
    console.error('Failed to warm cache:', error)
    process.exit(1)
  })
}

module.exports = { warmCache }
