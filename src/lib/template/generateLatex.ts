import { PersonalDetails } from '@/lib/types/personalDetails'
import { ExperienceBlockData } from '@/lib/types/experience'
import { ProjectBlockData } from '@/lib/types/projects'
import { ApiError } from '../types/errors'
import {
  sanitizeLatexText,
  sanitizeLatexBullet,
  sanitizeLatexTech,
  extractGitHubUsername,
  extractLinkedInUsername,
  extractWebsiteDomain,
} from '../utils'
import { EducationBlockData } from '../types/education'
import { SkillBlock } from '../types/skills'
import { AppSettings, ResumeSection } from '../types/settings'

export class LatexGenerationError extends Error {
  constructor(public error: ApiError) {
    super(error.message)
    this.name = 'LatexGenerationError'
  }
}

export const generateLatex = async (
  personalDetails: PersonalDetails,
  workExperience: ExperienceBlockData[],
  projects: ProjectBlockData[],
  education: EducationBlockData[],
  skills: SkillBlock[],
  settings: AppSettings
): Promise<string> => {
  const { name, email, linkedin, github, website, location } = personalDetails
  const extractedGitHub = extractGitHubUsername(github)
  const extractedLinkedIn = extractLinkedInUsername(linkedin)
  const extractedWebsite = extractWebsiteDomain(website)
  const { sectionOrder } = settings

  const buildPersonalDetailsHeader = () => {
    const nameSection = `\\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}`

    const contactParts = []

    if (location && location.trim()) {
      contactParts.push(`\\small ${location}`)
    }

    const emailPart = `\\href{mailto:${email}}{\\underline{${email}}}`
    contactParts.push(emailPart)

    if (linkedin && extractedLinkedIn) {
      contactParts.push(
        `\\href{https://linkedin.com/in/${extractedLinkedIn}}{\\underline{linkedin.com/in/${extractedLinkedIn}}}`
      )
    }

    if (github && extractedGitHub) {
      contactParts.push(
        `\\href{https://github.com/${extractedGitHub}}{\\underline{github.com/${extractedGitHub}}}`
      )
    }

    if (website && extractedWebsite) {
      contactParts.push(`\\href{${website}}{\\underline{${extractedWebsite}}}`)
    }

    let contactLine = ''
    if (contactParts.length > 0) {
      if (location && location.trim()) {
        contactLine = contactParts.join(' $|$ ')
      } else {
        contactLine = `\\small ${contactParts.join(' $|$ ')}`
      }
    }

    return `\\begin{center}
    ${nameSection}
    ${contactLine}
\\end{center}`
  }

  const experienceSection =
    workExperience && workExperience.length > 0
      ? workExperience
          .filter((exp) => exp.isIncluded !== false)
          .map((exp) => {
            const dateRange = exp.endDate.isPresent
              ? `${exp.startDate.month} ${exp.startDate.year} -- Present`
              : `${exp.startDate.month} ${exp.startDate.year} -- ${exp.endDate.month} ${exp.endDate.year}`

            const bulletPoints = (exp.bulletPoints || [])
              .map((bullet) => {
                const cleanBullet = sanitizeLatexBullet(bullet.text)
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
      {${sanitizeLatexText(exp.title)}}{${dateRange}}
      {${sanitizeLatexText(exp.companyName)}}{${sanitizeLatexText(
              exp.location
            )}}
${bulletSection}`
          })
          .join('\n\n')
      : null

  const projectsSection =
    projects && projects.length > 0
      ? projects
          .filter((project) => project.isIncluded !== false)
          .map((project) => {
            const dateRange = project.endDate.isPresent
              ? `${project.startDate.month} ${project.startDate.year} -- Present`
              : `${project.startDate.month} ${project.startDate.year} -- ${project.endDate.month} ${project.endDate.year}`

            const technologies = project.technologies?.length
              ? sanitizeLatexTech(project.technologies.join(', '))
              : ''

            const bulletPoints = (project.bulletPoints || [])
              .map((bullet) => {
                const cleanBullet = sanitizeLatexBullet(bullet.text)
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
        {\\textbf{${sanitizeLatexText(project.title)}}${
              technologies ? ` $|$ \\emph{${technologies}}` : ''
            }}{${dateRange}}
${bulletSection}`
          })
          .join('\n\n')
      : null

  const educationSection =
    education && education.length > 0
      ? education
          .filter((edu) => edu.isIncluded !== false)
          .map((edu) => {
            let dateRange = ''

            if (edu.startDate && edu.endDate) {
              if (
                edu.startDate.month &&
                edu.startDate.year &&
                edu.endDate.month &&
                edu.endDate.year
              ) {
                dateRange = `${edu.startDate.month} ${edu.startDate.year} -- ${edu.endDate.month} ${edu.endDate.year}`
              } else if (edu.startDate.year && edu.endDate.year) {
                dateRange = `${edu.startDate.year} -- ${edu.endDate.year}`
              }
            }

            return `
            \\resumeSubheading
              {${sanitizeLatexText(edu.institution)}}{${sanitizeLatexText(
              edu.location || ''
            )}}
              {${sanitizeLatexText(edu.degree)}}{${dateRange}}
        \\vspace{4pt}`
          })
          .join('\n\n')
      : null

  const skillsSection =
    skills && skills.length > 0
      ? `
        \\begin{itemize}[leftmargin=0.15in, label={}]
          \\small{\\item{
            ${skills
              .filter((skill) => skill.isIncluded !== false)
              .map((skill) => {
                const skillsList = skill.skills
                  .filter((s): s is string => !!s)
                  .map((s) => sanitizeLatexText(s))
                  .join(', ')
                return { title: skill.title, skillsList }
              })
              .filter((skill) => skill.skillsList.length > 0)
              .map((skill) => {
                return skill.title?.trim()
                  ? `\\textbf{${sanitizeLatexText(skill.title)}}{: ${
                      skill.skillsList
                    }}`
                  : skill.skillsList
              })
              .join(' \\\\ ')}
          }}
        \\end{itemize}`
      : null

  const sectionMap: Record<ResumeSection, string | null> = {
    [ResumeSection.EXPERIENCE]: experienceSection
      ? `%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart
${experienceSection}
  \\resumeSubHeadingListEnd`
      : null,

    [ResumeSection.PROJECTS]: projectsSection
      ? `%-----------PROJECTS-----------
\\section{Projects}
  \\resumeSubHeadingListStart
${projectsSection}
  \\resumeSubHeadingListEnd`
      : null,

    [ResumeSection.EDUCATION]: educationSection
      ? `%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
${educationSection}
  \\resumeSubHeadingListEnd`
      : null,

    [ResumeSection.SKILLS]: skillsSection
      ? `%-----------SKILLS-----------
\\section{Skills}
${skillsSection}`
      : null,
  }

  const sections = sectionOrder
    .map((sectionType) => sectionMap[sectionType])
    .filter((section): section is string => section !== null)

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
${buildPersonalDetailsHeader()}

${sections.join('\n\n')}

\\end{document}
  `
}
