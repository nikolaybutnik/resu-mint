import { ExperienceBlockData } from '@/lib/types/experience'
import { PersonalDetails } from '@/lib/types/personalDetails'
import { ApiError } from '../types/errors'
import { ProjectBlockData } from '@/lib/types/projects'

export class LatexGenerationError extends Error {
  constructor(public error: ApiError) {
    super(error.message)
    this.name = 'LatexGenerationError'
  }
}

export const generateLatex = async (
  personalDetails: PersonalDetails,
  workExperience: ExperienceBlockData[],
  projects: ProjectBlockData[]
): Promise<string> => {
  const { name, email, linkedin, github, location } = personalDetails
  const extractedGitHub = github?.replace(/\/$/, '').split('/').pop() || ''
  const extractedLinkedIn = linkedin?.replace(/\/$/, '').split('/').pop() || ''

  const experienceSection =
    workExperience && workExperience.length > 0
      ? workExperience
          .map((exp) => {
            const dateRange = exp.endDate.isPresent
              ? `${exp.startDate.month} ${exp.startDate.year} -- Present`
              : `${exp.startDate.month} ${exp.startDate.year} -- ${exp.endDate.month} ${exp.endDate.year}`

            const bulletPoints = (exp.bulletPoints || [])
              .map((bullet) => {
                const cleanBullet = bullet.text
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

            const bulletSection = bulletPoints
              ? `      \\resumeItemListStart
${bulletPoints}
      \\resumeItemListEnd`
              : '\\vspace{4pt}'

            return `
    \\resumeSubheading
      {${exp.title
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
${bulletSection}`
          })
          .join('\n\n')
      : null

  const projectsSection =
    projects && projects.length > 0
      ? projects
          .map((project) => {
            const dateRange = project.endDate.isPresent
              ? `${project.startDate.month} ${project.startDate.year} -- Present`
              : `${project.startDate.month} ${project.startDate.year} -- ${project.endDate.month} ${project.endDate.year}`

            const technologies = project.technologies?.length
              ? `${project.technologies
                  .join(', ')
                  .replace(/&/g, '\\&')
                  .replace(/%/g, '\\%')
                  .replace(/_/g, '\\_')
                  .replace(/\$/g, '\\$')
                  .replace(/\#/g, '\\#')
                  .replace(/\{/g, '\\{')
                  .replace(/\}/g, '\\}')}`
              : ''

            const bulletPoints = (project.bulletPoints || [])
              .map((bullet) => {
                const cleanBullet = bullet.text
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

            const bulletSection = bulletPoints
              ? `      \\resumeItemListStart
      ${bulletPoints}
            \\resumeItemListEnd`
              : '\\vspace{4pt}'

            return `
      \\resumeProjectHeading
        {\\textbf{${project.title
          .replace(/&/g, '\\&')
          .replace(/%/g, '\\%')
          .replace(/_/g, '\\_')}}${
              technologies ? ` $|$ \\emph{${technologies}}` : ''
            }}{${dateRange}}
${bulletSection}`
          })
          .join('\n\n')
      : null

  const sections = []

  if (experienceSection) {
    sections.push(`%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart
${experienceSection}
  \\resumeSubHeadingListEnd`)
  }

  if (projectsSection) {
    sections.push(`%-----------PROJECTS-----------
\\section{Projects}
  \\resumeSubHeadingListStart
${projectsSection}
  \\resumeSubHeadingListEnd`)
  }

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
\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}
    \\small ${
      location || ''
    } $|$ \\href{mailto:${email}}{\\underline{${email}}} $|$ 
    \\href{https://linkedin.com/in/${extractedLinkedIn}}{\\underline{linkedin.com/in/${extractedLinkedIn}}} $|$
    \\href{https://github.com/${extractedGitHub}}{\\underline{github.com/${extractedGitHub}}}
\\end{center}

${sections.join('\n\n')}

\\end{document}
  `
}
