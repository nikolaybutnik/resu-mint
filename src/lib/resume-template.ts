export const getResumeTemplate = (
  name: string,
  email: string,
  phone: string,
  sections: { [key: string]: string[] }[]
): string => {
  const experienceSections = sections
    .map((section) => {
      const [jobTitle, bullets] = Object.entries(section)[0]
      const bulletItems = bullets.length
        ? bullets.map((bullet) => `  \\item ${bullet}`).join('\n')
        : '  \\item No accomplishments listed'
      return `
  \\section{${jobTitle}}
  \\begin{itemize}
  ${bulletItems}
  \\end{itemize}
        `
    })
    .join('\n')

  return `
  \\documentclass[a4paper,12pt]{article}
  \\usepackage[utf8]{inputenc}
  \\usepackage{geometry}
  \\geometry{margin=1in}
  \\usepackage{enumitem}
  \\setlist[itemize]{leftmargin=*}
  \\begin{document}
  
  \\begin{center}
    {\\Large \\textbf{${name}}}\\\\
    \\vspace{0.2cm}
    ${email} \\textbullet{} ${phone}
  \\end{center}
  
  \\section*{Experience}
  ${experienceSections}
  
  \\end{document}
    `
}
