const { spawn, spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const platform = process.platform
const binName = platform === 'linux' ? 'tectonic-linux' : 'tectonic'
const TECTONIC_PATH = path.join(__dirname, '..', 'bin', binName)

// Multiple realistic resume samples to warm Tectonic cache with comprehensive character coverage
const resumeSamples = [
  // Sample 1: Basic escaped characters (matching user's actual resume structure)
  `
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

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

\\begin{center}
\\textbf{\\Huge \\scshape Nikolay Butnik} \\\\ \\vspace{1pt}
\\small Ottawa, ON $|$ \\href{mailto:btnk.nik@gmail.com}{\\underline{btnk.nik@gmail.com}} $|$ \\href{https://linkedin.com/in/nikolay-butnik}{\\underline{linkedin.com/in/nikolay-butnik}}
\\end{center}

\\section{Experience}
\\resumeSubHeadingListStart
\\resumeSubheading{Full-Stack Developer}{Jan 2023 -- Nov 2024}{TMG}{Chicago, IL (Remote)}
\\resumeItemListStart
\\resumeItem{Automated end-to-end testing with Cypress, increasing test coverage to 70\\% to reduce production bugs by 25\\% and boost deployment consistency\\mbox{}}
\\resumeItem{Led cross-functional collaboration to modernize manufacturing workflows using Angular and NgRx, improving operational efficiency by 10\\% while enhancing UI responsiveness by 20\\%\\mbox{}}
\\resumeItem{Utilized Postman for effective endpoint testing of Python microservices, enhancing system reliability by 25\\% through improved responsiveness\\mbox{}}
\\resumeItemListEnd
\\resumeSubHeadingListEnd

\\section{Projects}
\\resumeSubHeadingListStart
\\resumeProjectHeading{\\textbf{Resu-Mint} $|$ \\emph{TypeScript, Next.js, React, OpenAI, dnd-kit, Zod}}{Apr 2025 -- Present}
\\resumeItemListStart
\\resumeItem{Developed AI-powered bullet generation for project and work experience blocks, enhancing content relevance to job descriptions\\mbox{}}
\\resumeItem{Utilized AI for dynamic resume tailoring, ensuring precise Job-Description alignment with LaTeX PDF output.\\mbox{}}
\\resumeItemListEnd
\\resumeSubHeadingListEnd

\\section{Education}
\\resumeSubHeadingListStart
\\resumeSubheading{Algonquin College of Applied Arts \\& Technology}{Ottawa, ON}{Advanced Diploma - Architectural Technology}{}
\\vspace{4pt}
\\resumeSubHeadingListEnd
\\end{document}
`,

  // Sample 2: Heavy escaped characters
  `
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

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

\\begin{center}
\\textbf{\\Huge \\scshape Sarah O'Connor \\& Associates} \\\\ \\vspace{1pt}
\\small New York, NY $|$ \\href{mailto:sarah.o\\_connor@tech\\_company.org}{\\underline{sarah.o\\_connor@tech\\_company.org}}
\\end{center}

\\section{Experience}
\\resumeSubHeadingListStart
\\resumeSubheading{Senior Engineer \\& Team Lead}{Mar 2022 -- Present}{TechCorp \\& Solutions LLC}{San Francisco, CA}
\\resumeItemListStart
\\resumeItem{Developed React.js \\& TypeScript applications with 95\\% test coverage, reducing bugs by 40\\%\\mbox{}}
\\resumeItem{Led backend development using Python\\#Django \\& Node.js, improving API performance by 60\\%\\mbox{}}
\\resumeItem{Managed databases: PostgreSQL\\&MySQL optimization, Redis caching, reducing query time by 75\\%\\mbox{}}
\\resumeItem{DevOps work: Docker\\&Kubernetes deployment, CI/CD pipelines, AWS\\&GCP cloud infrastructure\\mbox{}}
\\resumeItem{Code quality: ESLint\\&Prettier setup, Jest\\&Cypress testing, SonarQube analysis\\mbox{}}
\\resumeItem{Project management: Jira\\&Confluence, Scrum\\&Kanban, stakeholder communication\\mbox{}}
\\resumeItemListEnd
\\resumeSubHeadingListEnd

\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
\\item{\\textbf{Languages}: JavaScript/TypeScript, Python, Java, C\\#, Go, Rust, SQL}
\\item{\\textbf{Frameworks}: React.js\\&Next.js, Node.js\\&Express, Django\\&FastAPI}
\\item{\\textbf{Databases}: PostgreSQL\\&MySQL, MongoDB\\&Redis, DynamoDB\\&Cassandra}
\\item{\\textbf{Tools}: Git\\&GitHub, Docker\\&Kubernetes, AWS\\&Azure, Jenkins\\&GitLab}
\\end{itemize}

\\section{Special Characters \\& Package Testing}
\\begin{itemize}[leftmargin=0.15in, label={}]
\\item{\\textbf{Percentages}: 95\\% uptime, 80\\% performance, 75\\% cost reduction, 90\\% satisfaction}
\\item{\\textbf{Dollar amounts}: \\$50K savings, \\$2.5M revenue, \\$100K+ transactions, \\$25K budget}
\\item{\\textbf{Underscores}: file\\_name, database\\_table, api\\_endpoint, user\\_id, session\\_token}
\\item{\\textbf{Ampersands}: Frontend\\&Backend, DevOps\\&SRE, AI\\&ML, Security\\&Compliance}
\\item{\\textbf{Hash symbols}: API\\#keys, endpoint\\#documentation, version\\#control, commit\\#hashes}
\\item{\\textbf{Curly braces}: \\{config\\}, \\{environment\\}, \\{variables\\}, \\{secrets\\}, \\{tokens\\}}
\\end{itemize}
\\end{document}
`,
]

async function warmCache() {
  console.log('Warming Tectonic cache...')

  // Check if tectonic binary exists
  if (!fs.existsSync(TECTONIC_PATH)) {
    console.error('Tectonic binary not found. Run download-tectonic.js first.')
    process.exit(1)
  }

  // Create cache directories - use project directory instead of /tmp for Vercel persistence
  const cacheDir = path.join(
    process.cwd(),
    '.vercel-cache',
    'tectonic-build-cache'
  )
  const xdgCacheDir = path.join(
    process.cwd(),
    '.vercel-cache',
    'xdg-build-cache'
  )

  // Clean existing cache to prevent accumulation across builds
  try {
    if (fs.existsSync(cacheDir)) {
      console.log('Cleaning existing Tectonic cache...')
      fs.rmSync(cacheDir, { recursive: true, force: true })
    }
    if (fs.existsSync(xdgCacheDir)) {
      console.log('Cleaning existing XDG cache...')
      fs.rmSync(xdgCacheDir, { recursive: true, force: true })
    }
  } catch (error) {
    console.warn('Warning: Could not clean existing cache:', error.message)
  }

  try {
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.mkdirSync(xdgCacheDir, { recursive: true })
  } catch (error) {
    console.warn('Warning: Could not create cache directories:', error.message)
  }

  console.log(
    'Compiling multiple resume samples to download comprehensive packages...'
  )

  // Compile each sample to ensure comprehensive package coverage
  for (let i = 0; i < resumeSamples.length; i++) {
    console.log(`Compiling sample ${i + 1}/${resumeSamples.length}...`)

    // Create temporary directory to match API behavior
    const tempId = require('crypto').randomUUID()
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `cache-warm-${tempId}-`)
    )

    const result = spawnSync(
      TECTONIC_PATH,
      ['-X', 'compile', '-', '--outdir', tempDir],
      {
        input: resumeSamples[i],
        encoding: 'utf-8',
        env: {
          ...process.env,
          TECTONIC_CACHE_DIR: cacheDir,
          XDG_CACHE_HOME: xdgCacheDir,
          HOME: tempDir,
        },
      }
    )

    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (e) {
      // Ignore cleanup errors
    }

    if (result.status === 0) {
      console.log(`  ✓ Sample ${i + 1} compiled successfully`)
    } else {
      console.log(`  ✗ Sample ${i + 1} failed:`)
      console.log('STDOUT:', result.stdout)
      console.log('STDERR:', result.stderr)
    }
  }

  console.log('Cache warming completed successfully!')
  console.log('Cache statistics:')

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
    const totalSize = tectonicSize + xdgSize
    const totalSizeMB = Math.round((totalSize / 1024 / 1024) * 100) / 100

    console.log(`   Tectonic cache: ${cacheDir}`)
    console.log(
      `   - Files: ${tectonicFiles}, Size: ${Math.round(tectonicSize / 1024)}KB`
    )
    console.log(`   XDG cache: ${xdgCacheDir}`)
    console.log(
      `   - Files: ${xdgFiles}, Size: ${Math.round(xdgSize / 1024)}KB`
    )
    console.log(`   Total: ${tectonicFiles + xdgFiles} files, ${totalSizeMB}MB`)

    // Warn if cache is unexpectedly large (should be ~20-25MB max)
    if (totalSizeMB > 30) {
      console.warn('⚠️  WARNING: Cache size is unexpectedly large!')
      console.warn(`   Expected: ~20-25MB, Actual: ${totalSizeMB}MB`)
      console.warn('   This may indicate cache accumulation across builds.')
      console.warn(
        '   Consider clearing the cache if deployment size is an issue.'
      )
    } else if (totalSizeMB > 25) {
      console.warn(
        `⚠️  Cache size is above normal: ${totalSizeMB}MB (expected ~20MB)`
      )
    } else {
      console.log(`✅ Cache size is normal: ${totalSizeMB}MB`)
    }
  } catch (e) {
    console.log('   Cache directories created (unable to read detailed stats)')
  }
}

if (require.main === module) {
  warmCache().catch((error) => {
    console.error('Failed to warm cache:', error)
    process.exit(1)
  })
}

module.exports = { warmCache }
