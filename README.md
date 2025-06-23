# ResuMint: AI-Powered Resume Builder

## Overview

ResuMint is a modern web application that uses AI to create tailored, ATS-friendly resumes optimized for specific job descriptions. Powered by OpenAI's language models and built with Next.js, ResuMint automates resume customization with intelligent keyword analysis, generating bullet points that highlight your relevant skills and experiences. It produces professional PDF resumes using LaTeX and Tectonic, with real-time live preview capabilities ensuring clean formatting and precise typography.

This project is public, with a custom license allowing personal use and forks for non-commercial purposes. I plan to introduce user authentication and premium features (e.g., advanced templates, analytics) for commercial use in the future.

## Key Features

### AI-Powered Resume Creation
- **Intelligent Bullet Generation**: Creates tailored bullet points matching job descriptions using OpenAI's GPT models
- **Job Description Analysis**: Extracts key skills, requirements, and context from job postings
- **Keyword Prioritization**: Analyzes keyword usage across resume sections to prioritize underused skills
- **Skill Alignment Tracking**: Monitors alignment between job requirements and resume content

### Live Preview & PDF Generation
- **Real-Time Preview**: Instant PDF preview with debounced updates during editing
- **Advanced Caching**: Multi-tier caching system (memory + localStorage) for optimal performance
- **LaTeX PDF Generation**: Produces ATS-friendly PDFs with Tectonic for professional output
- **Queue Management**: Handles multiple concurrent requests efficiently

### Comprehensive Resume Sections
- **Personal Details**: Contact information and professional profiles
- **Work Experience**: Drag-and-drop interface with AI-generated bullet points
- **Projects**: Project showcase with drag-and-drop interface, technology highlighting, and AI-generated bullet points
- **Education**: Academic background and certifications
- **Skills Management**: Automatic skill extraction from descriptions with manual curation

### Smart User Experience
- **Drag-and-Drop Interface**: Easily arrange sections with dnd-kit, or hide sections entirely
- **Mobile-Responsive**: Optimized input and preview modes for all devices (work in progress)
- **Intelligent Messaging**: Context-aware status updates and requirement guidance
- **Data Persistence**: Hybrid approach between memory caching and browser storage, with planned database integration

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, SASS
- **AI Integration**: OpenAI API (GPT-4o mini, GPT-4) with tiktoken for token management
- **PDF Generation**: LaTeX with Tectonic for professional resume output
- **UI Components**: dnd-kit for drag-and-drop, react-pdf for preview, react-icons
- **Validation**: Zod schemas for type-safe form validation
- **State Management**: React hooks with localStorage persistence

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- pnpm, npm, or yarn
- OpenAI API key
- Tectonic (automatically downloaded during build): [Tectonic Documentation](https://tectonic-typesetting.github.io)

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

### Getting Started
1. **Enter Job Description**: Paste a job posting for AI analysis and keyword extraction
2. **Input Personal Details**: Add contact information and professional profiles
3. **Build Your Resume**: Add work experience, projects, and education with drag-and-drop organization

### AI-Powered Features
4. **Automatic Skill Detection**: Skills are extracted from your descriptions and categorized
5. **Keyword Optimization**: The system tracks keyword usage and prioritizes underused skills
6. **Smart Bullet Generation**: AI creates targeted bullet points emphasizing relevant keywords

### Customization & Export
7. **Live Preview**: Watch your resume update in real-time as you make changes
8. **Customize Settings**: Adjust bullet point counts, character limits, and AI model preferences
9. **Download PDF**: Generate and save your optimized resume

## Architecture

ResuMint uses a modern, scalable Next.js architecture with intelligent caching and state management:

### Core Architecture
- **App Router**: Handles routing and API endpoints with TypeScript
- **Component Architecture**: Feature-based organization with shared utilities
- **Type Safety**: Comprehensive TypeScript with Zod validation schemas
- **Styling**: SASS modules for component-based styling

### AI & Processing Pipeline
- **Job Analysis**: Extracts keywords, skills, and requirements from job descriptions
- **Keyword Management**: Tracks usage statistics and prioritizes underused skills
- **Bullet Generation**: Context-aware AI prompting with keyword prioritization
- **Skill Extraction**: Automatic skill detection from user descriptions

### Performance Optimizations

ResuMint implements a multi-tier caching system to minimize PDF generation latency and eliminate cold start delays:

#### PDF Generation Cache Strategy

**Cache Flow Decision Tree:**

| Step | Condition | Action | Performance | Details |
|------|-----------|--------|-------------|---------|
| 1 | User requests PDF | → Check cache directories | - | API route `/api/create-pdf` |
| 2 | Persistent cache exists? | ✅ Use persistent cache | ⚡ **Fast** (2-3s) | 496 packages pre-cached (~42MB) |
| 3 | Runtime cache exists? | ✅ Use runtime cache | ⏱️ **Medium** (4-8s) | Some packages cached |
| 4 | No cache found | ❌ Download packages | 🐌 **Slow** (8-12s) | Download + save to runtime cache |

**Cache Directory Priority:**
```
1st Priority: .vercel-cache/tectonic-build-cache  (Persistent, deployed with app)
2nd Priority: /tmp/tectonic-shared-cache          (Runtime, created on first request)
3rd Fallback: Download fresh packages             (Cold start scenario)
```

#### Cache Tiers Explained

1. **Persistent Cache (Pre-warmed)**
   - **Created**: During build process by `warm-tectonic-cache.js`
   - **Contains**: 496 LaTeX packages (~42MB) including comprehensive font collections
   - **Performance**: ⚡ **2-3 second** PDF generation
   - **Persistence**: Deployed with application, available immediately
   - **Environment**: ~19MB on local (macOS), ~42MB in production (Linux + fonts)

2. **Runtime Cache (On-demand)**
   - **Created**: By first PDF request when persistent cache is missing
   - **Contains**: Packages downloaded during runtime
   - **Performance**: ⏱️ **4-8 seconds** with some package downloads
   - **Persistence**: Shared across requests in same container instance

3. **Fallback Strategy**
   - **Triggers**: When no cache exists (rare scenarios)
   - **Behavior**: Downloads all packages fresh (8-12 seconds)
   - **Recovery**: Subsequent requests use newly created runtime cache

#### Additional Optimizations

- **Live Preview Service**: Debounced PDF generation with multi-tier caching
- **Request Queue Management**: Handles concurrent requests with intelligent deduplication
- **Local Storage Caching**: Persistent PDF caching for improved performance (utilizing blob size strategies)
- **Cache Warming**: Automated package download during build with fresh cache creation
- **Environment Adaptation**: Cache size varies by environment (local vs production) for optimal resource usage
- **Deployment Integration**: Cache included in deployment via Next.js `outputFileTracingIncludes`

## Project Structure

```
resu-mint/
├── public/              # Static assets and icons
├── scripts/             # Build scripts (Tectonic download)
├── src/
│   ├── app/             # App Router pages and API routes
│   │   ├── api/         # AI and PDF generation endpoints
│   │   │   ├── analyze-job-description/    # Job analysis
│   │   │   ├── generate-bullets/           # AI bullet generation
│   │   │   ├── create-pdf/                 # PDF generation
│   │   │   └── parse-section-skills/       # Skill extraction
│   │   ├── globals.scss     # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main application page
│   ├── components/      # React components
│   │   ├── FormsContainer/  # Main application container
│   │   ├── ResumePreview/   # Live PDF preview
│   │   ├── JobDescription/  # Job analysis interface
│   │   ├── PersonalDetails/ # Contact information
│   │   ├── Experience/      # Work history with drag-and-drop
│   │   ├── Projects/        # Project showcase
│   │   ├── Education/       # Academic background
│   │   ├── Skills/          # Skill management
│   │   ├── Settings/        # Application preferences
│   │   ├── LoadingSpinner/  # Reusable loading component
│   │   └── shared/          # Shared UI components
│   ├── lib/             # Core utilities and services
│   │   ├── ai/              # AI prompts and tools
│   │   ├── services/        # API and business logic
│   │   │   ├── livePreviewService.ts  # PDF preview management
│   │   │   ├── api.ts               # HTTP client
│   │   │   ├── bulletService.ts     # Bullet generation
│   │   │   └── pdfService.ts        # PDF creation
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useKeywordAnalysis.ts # Keyword tracking
│   │   ├── types/           # TypeScript definitions
│   │   │   ├── api.ts       # API request/response types
│   │   │   ├── keywords.ts  # Keyword analysis types
│   │   │   ├── experience.ts, projects.ts, education.ts
│   │   │   └── settings.ts, personalDetails.ts, errors.ts
│   │   ├── template/        # LaTeX resume templates
│   │   ├── keywordUtils.ts  # Keyword analysis utilities
│   │   ├── clientUtils.ts   # Client-side utilities
│   │   ├── utils.ts         # General utilities
│   │   ├── constants.ts     # Application constants
│   │   └── validationSchemas.ts # Zod validation schemas
│   └── styles/          # SASS styles and variables
├── .env.local           # Environment variables
├── next.config.ts       # Next.js configuration
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## API Endpoints

- **POST /api/analyze-job-description** - Analyzes job postings and extracts keywords
- **POST /api/generate-bullets** - Creates AI-powered bullet points for experiences/projects
- **POST /api/create-pdf** - Generates LaTeX-based PDF resumes
- **POST /api/parse-section-skills** - Extracts skills from user descriptions

## Future Enhancements

### Authentication & Data
- **User Authentication**: Secure profiles with database storage (replacing browser storage)
- **Version History**: Track and restore previous resume versions

### Premium Features
- **Multiple Templates**: Professional resume layouts and themes, optimized for ATS readability
- **Cover Letter Generation**: AI-powered cover letter creation
- **Resume Analytics**: Performance tracking and optimization suggestions
- **Interview Preparation**: AI-generated interview questions based on job descriptions

### Advanced AI Features
- **Gap Analysis**: Identify missing skills and suggest improvements
- **Industry Optimization**: Tailor resumes for specific industries
- **ATS Scoring**: Predict and optimize Applicant Tracking System compatibility

## Contributing

Contributions are welcome for non-commercial improvements (e.g., bug fixes, UI enhancements, new features). To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Submit a Pull Request with a clear description

Note: Contributions may be incorporated at my discretion, per the license terms.

## License

Copyright © 2025 Nikolay Butnik. All rights reserved.

### Permissions

- View, fork, and study the source code
- Use and modify for personal, non-commercial resume creation
- Contribute improvements via Pull Requests

### Restrictions

- No commercial use or redistribution without written permission
- No hosting as a service or use in commercial products
- No removal or modification of this license

### Personal Use

"Personal use" means individual resume creation, not providing services to others or commercial offerings.

### Forking

Forks are allowed for personal use, education, or contributions, per the restrictions above.

### Warranty

This software is provided "as is," without any warranty.

### Future Plans

I may introduce commercial licenses or premium features requiring authentication. This license applies to the current version and may change in future releases.

## Acknowledgments

- [Next.js](https://nextjs.org/) for the robust React framework
- [OpenAI](https://openai.com/) for advanced AI capabilities
- [Jake Gutierrez](https://github.com/jakegut) for LaTeX resume template inspiration
- [Tectonic](https://tectonic-typesetting.github.io) for reliable PDF generation
- [dnd-kit](https://dndkit.com/) for fluid drag-and-drop functionality

## Contact

For inquiries, commercial licensing, or to view a live demo, contact me at [btnk.nik@gmail.com](mailto:btnk.nik@gmail.com).

---

*Built with ❤️ and AI to help you land your dream job.*
