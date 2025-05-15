# ResuMint: AI-Powered Resume Builder

## Overview

ResuMint is a modern web application that uses AI to create tailored, ATS-friendly resumes optimized for specific job descriptions. Powered by OpenAI’s language models and built with Next.js, ResuMint automates resume customization, generating bullet points that highlight your relevant skills and experiences. It produces professional PDF resumes using LaTeX and Tectonic, ensuring clean formatting and precise typography.

This project is public, with a custom license allowing personal use and forks for non-commercial purposes. I plan to introduce user authentication and premium features (e.g., advanced templates, analytics) for commercial use in the future.

## Key Features

- **AI-Powered Resume Creation**: Generates tailored bullet points matching job descriptions using OpenAI’s GPT models.
- **Job Description Analysis**: Extracts key skills and requirements from job postings.
- **LaTeX PDF Generation**: Produces ATS-friendly PDFs with Tectonic.
- **Drag-and-Drop Interface**: Easily arrange work history and projects with dnd-kit.
- **Customizable Settings**: Adjust bullet point count, character limits, and AI model preferences.
- **Local Data Persistence**: Saves data in your browser (temporary; user authentication and database integration are planned).

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, SASS
- **AI Integration**: OpenAI API (GPT-4o mini, GPT-4)
- **PDF Generation**: LaTeX with Tectonic for professional resume output
- **UI Components**: dnd-kit for drag-and-drop, Zod for form validation

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- pnpm, npm, or yarn
- OpenAI API key
- Tectonic (for PDF generation): [Install Tectonic](https://tectonic-typesetting.github.io)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/nikolaybutnik/resu-mint.git
   cd resu-mint
   ```

2. Install dependencies:

   ```bash
   pnpm install
   # or
   npm install
   ```

3. Create a `.env.local` file in the root directory:

   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Start the development server:

   ```bash
   pnpm dev
   # or
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the app.

## How to Use

1. **Enter Job Description**: Paste a job posting for analysis.
2. **Input Personal Details**: Add contact and profile information.
3. **Add Experience & Projects**: Enter work history and projects (draggable with dnd-kit).
4. **Customize Settings**: Set bullet point limits or AI model preferences.
5. **Generate Resume**: Click “Mint Resume” to create a tailored LaTeX-based PDF.
6. **Download PDF**: Save your resume to your device.

## Architecture

ResuMint uses a modern Next.js architecture:

- **App Router**: Handles routing and API endpoints.
- **API Routes**: Process AI requests and PDF generation.
- **Component Structure**: Organized by feature.
- **Type Safety**: TypeScript with Zod schemas for form validation.
- **Styling**: SASS for module-based component styling.

## Project Structure

```
resu-mint/
├── public/              # Static assets
├── src/
│   ├── app/             # App Router pages and API routes
│   │   ├── api/         # AI and PDF endpoints
│   │   │   ├── analyze-job-description/
│   │   │   ├── generate-bullets/
│   │   │   └── mint-resume/
│   │   ├── components/  # React components
│   │   │   ├── Experience/
│   │   │   ├── JobDescription/
│   │   │   ├── PersonalDetails/
│   │   │   ├── Projects/
│   │   │   ├── ResumePreview/
│   │   │   └── Settings/
│   │   ├── lib/         # Utilities
│   │   │   ├── ai/
│   │   │   ├── template/ # LaTeX templates
│   │   │   ├── types/
│   │   │   └── validation/
│   │   └── styles/      # SASS styles and variables
├── .env.local           # Environment variables
├── next.config.ts       # Next.js configuration
└── package.json         # Dependencies
```

## Future Enhancements

- **User Authentication**: Secure profiles with database storage (replacing browser storage).
- **Premium Features**: Templates, cover letters, and resume analytics.
- **Additional Sections**: Education, skills, and certifications.
- **Live Preview**: Real-time PDF previews.
- **Interview Prep**: AI-generated interview questions based on job descriptions.

## Contributing

Contributions are welcome for non-commercial improvements (e.g., bug fixes, UI tweaks). To contribute:

1. Fork the repository.
2. Create a branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m 'Add feature'`).
4. Submit a Pull Request with a clear description.
   Note: Contributions may be incorporated at my discretion, per the license.

## License

Copyright © 2025 Nikolay Butnik. All rights reserved.

### Permissions

- View, fork, and study the source code.
- Use and modify for personal, non-commercial resume creation.
- Contribute improvements via Pull Requests.

### Restrictions

- No commercial use or redistribution without written permission.
- No hosting as a service or use in commercial products.
- No removal or modification of this license.

### Personal Use

“Personal use” means individual resume creation, not providing services to others or commercial offerings.

### Forking

Forks are allowed for personal use, education, or contributions, per the restrictions above.

### Warranty

This software is provided “as is,” without any warranty.

### Future Plans

I may introduce commercial licenses or premium features requiring authentication. This license applies to the current version and may change in future releases.

## Acknowledgments

- [Next.js](https://nextjs.org/) for the framework.
- [OpenAI](https://openai.com/) for AI capabilities.
- [Jake Gutierrez](https://github.com/jakegut) for LaTeX resume template inspiration.
- [Tectonic](https://tectonic-typesetting.github.io) for PDF generation.

## Contact

For inquiries, commercial licensing, or to view a live demo, contact me at [btnk.nik@gmail.com](mailto:btnk.nik@gmail.com).
