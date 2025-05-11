import { ExperienceBlockData } from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import { PersonalDetailsFormValues } from '@/components/PersonalDetails/PersonalDetails'
import { ApiError } from '../types/errors'

export class LatexGenerationError extends Error {
  constructor(public error: ApiError) {
    super(error.message)
    this.name = 'LatexGenerationError'
  }
}

export const generateLatex = async (
  experienceBullets: { id: string; bullets: string[] }[],
  workExperience: ExperienceBlockData[],
  personalDetails: PersonalDetailsFormValues
): Promise<string> => {
  const { name, email, linkedin, github, location } = personalDetails
  const extractedGitHub = github?.replace(/\/$/, '').split('/').pop() || ''
  const extractedLinkedIn = linkedin?.replace(/\/$/, '').split('/').pop() || ''

  const sortedExperience = [...workExperience].sort((a, b) => {
    if (a.endDate.isPresent && !b.endDate.isPresent) return -1
    if (!a.endDate.isPresent && b.endDate.isPresent) return 1

    const aYear = parseInt(
      a.endDate.isPresent ? new Date().getFullYear().toString() : a.endDate.year
    )
    const bYear = parseInt(
      b.endDate.isPresent ? new Date().getFullYear().toString() : b.endDate.year
    )

    if (aYear !== bYear) return bYear - aYear

    const monthOrder = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    }

    const aMonth = a.endDate.isPresent
      ? 12
      : monthOrder[a.endDate.month as keyof typeof monthOrder]
    const bMonth = b.endDate.isPresent
      ? 12
      : monthOrder[b.endDate.month as keyof typeof monthOrder]

    return bMonth - aMonth
  })

  const experienceSection = sortedExperience
    .map((exp) => {
      const dateRange = exp.endDate.isPresent
        ? `${exp.startDate.month} ${exp.startDate.year} -- Present`
        : `${exp.startDate.month} ${exp.startDate.year} -- ${exp.endDate.month} ${exp.endDate.year}`

      const expBullets =
        experienceBullets.find((eb) => eb.id === exp.id)?.bullets || []

      const bulletPoints = expBullets
        .map((bullet) => {
          const cleanBullet = bullet
            .trim()
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_')
            .replace(/\$/g, '\\$')
            .replace(/\#/g, '\\#')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\r?\n|\r/g, ' ')
            .replace(/\s+/g, ' ')

          return `    \\resumeItem{${cleanBullet}\\mbox{}}`
        })
        .join('\n')

      return `
    \\resumeSubheading
      {${exp.jobTitle
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')}}{${dateRange}}
      {${exp.companyName
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')}}{${exp.location
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')}}
      \\resumeItemListStart
${bulletPoints}
      \\resumeItemListEnd`
    })
    .join('\n\n')

  return `
%-------------------------
% Resume in Latex
% Author : Jake Gutierrez
% Based off of: https://github.com/sb2nov/resume
% License : MIT
%------------------------

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
% \\input{glyphtounicode} % Commented out temporarily - will be enabled when file is available

%----------FONT OPTIONS----------
% sans-serif
% \\usepackage[sfdefault]{FiraSans}
% \\usepackage[sfdefault]{roboto}
% \\usepackage[sfdefault]{noto-sans}
% \\usepackage[default]{sourcesanspro}

% serif
% \\usepackage{CormorantGaramond}
% \\usepackage{charter}

\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Ensure that generate pdf is machine readable/ATS parsable
% \\pdfgentounicode=1 % Commented out temporarily - will be enabled when compiler supports it

%-------------------------
% Custom commands
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

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\begin{document}

%----------HEADING----------
% \\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
%   \\textbf{\\href{http://sourabhbajaj.com/}{\\Large Sourabh Bajaj}} & Email : \\href{mailto:sourabh@sourabhbajaj.com}{sourabh@sourabhbajaj.com}\\\\
%   \\href{http://sourabhbajaj.com/}{http://www.sourabhbajaj.com} & Mobile : +1-123-456-7890 \\\\
% \\end{tabular*}

\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}
    \\small ${
      location || ''
    } $|$ \\href{mailto:${email}}{\\underline{${email}}} $|$ 
    \\href{https://linkedin.com/in/${extractedLinkedIn}}{\\underline{linkedin.com/in/${extractedLinkedIn}}} $|$
    \\href{https://github.com/${extractedGitHub}}{\\underline{github.com/${extractedGitHub}}}
\\end{center}

%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart
${experienceSection}
  \\resumeSubHeadingListEnd

\\end{document}
  `
}
