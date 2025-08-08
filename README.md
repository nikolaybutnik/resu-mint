# ResuMint: AI-Powered Resume Builder

## Overview

ResuMint is a modern web application that uses AI to create tailored, ATS-friendly resumes optimized for specific job descriptions. Powered by OpenAI's language models and built with Next.js, ResuMint automates resume customization with intelligent keyword analysis, generating bullet points that highlight your relevant skills and experiences. It produces professional PDF resumes using LaTeX and Tectonic, with real-time live preview capabilities ensuring clean formatting and precise typography.

This project is public, with a custom license allowing personal use and forks for non-commercial purposes. It includes user authentication with Supabase, and I plan to introduce premium features (e.g., advanced templates, analytics) for commercial use in the future.

## Key Features

### Authentication & Data Management
- **Dual-Path Data System**: Authenticated users get database storage, unauthenticated users get localStorage
- **Secure Authentication**: Email/password signup and login with Supabase Auth
- **Row Level Security**: Database policies ensure users only access their own data
- **Session Management**: Automatic session persistence and middleware-based route protection
- **Password Security**: Comprehensive validation with requirements for security and special characters

### AI-Powered Resume Creation
- **Intelligent Bullet Generation**: Creates tailored bullet points matching job descriptions using OpenAI's GPT models
- **Job Description Analysis**: Extracts key skills, requirements, and context from job postings
- **Skill Extraction & Categorization**: Automatically extracts skills from user content and intelligently categorizes them based on job requirements
- **Skill Suggestion System**: Suggests relevant skills based on user experience and job analysis
- **Keyword Prioritization**: Analyzes keyword usage across resume sections to prioritize underused skills
- **Skill Alignment Tracking**: Monitors alignment between job requirements and resume content

### PDF Generation & Preview
- **Automatic Preview**: PDF preview with debounced updates during editing
- **Advanced Caching**: Multi-tier caching system (memory + localStorage) for optimal performance
- **LaTeX PDF Generation**: Produces ATS-friendly PDFs with Tectonic for professional output
- **Queue Management**: Handles multiple concurrent requests efficiently

### Comprehensive Resume Sections
- **Personal Details**: Contact information and professional profiles
- **Work Experience**: Drag-and-drop interface with AI-generated bullet points
- **Projects**: Project showcase with drag-and-drop interface, technology highlighting, and AI-generated bullet points
- **Education**: Academic background and certifications
- **Skills Management**: Automatic skill extraction from descriptions, intelligent categorization, and manual curation with suggestion system

### Smart User Experience
- **Welcome Experience**: Guided 5-step onboarding flow with personalized content and smart progress tracking
- **Drag-and-Drop Interface**: Easily arrange sections with dnd-kit, or hide sections entirely
- **Mobile-Responsive**: Optimized input and preview modes for all devices (work in progress)
- **Intelligent Messaging**: Context-aware status updates and requirement guidance
- **Skeleton Loading**: Consistent loading states using design system mixins for seamless UX
- **Data Persistence**: Zustand-based global state management with intelligent localStorage caching

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, SASS
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Database**: Supabase PostgreSQL with TypeScript type generation
- **AI Integration**: OpenAI API (GPT-4o mini, GPT-4) with tiktoken for token management
- **PDF Generation**: LaTeX with Tectonic for professional resume output  
- **UI Components**: dnd-kit for drag-and-drop, react-pdf for preview, react-icons
- **Validation**: Zod schemas for type-safe form validation
- **State Management**: Zustand for global state with dual-path data persistence (Database + localStorage)
- **Loading States**: Mixin-based skeleton system integrated with design tokens

## Getting Started

### Prerequisites

- Node.js (v18.18.0 or newer)
- pnpm, npm, or yarn
- Docker and Docker Compose (for local Supabase development)
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
   npm install
   ```

3. Set up Supabase for local development:

   ```bash
   # Install Supabase CLI
   npm install -g @supabase/cli

   # Start local Supabase stack (requires Docker)
   # This automatically applies the migration in supabase/migrations/
   npx supabase start
   ```

   This will start local Supabase services, apply the database migration to create all tables with Row Level Security policies, and display connection details.

4. Create a `.env.local` file in the root directory:

   ```env
   OPENAI_API_KEY=your_api_key_here
   
   # Local Supabase (from `supabase start` output)
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
   SUPABASE_SECRET_KEY=your_service_role_key_here
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) to view the app.

### Database Management

The app uses a **dual-path data management system**:

- **Authenticated Users**: Data is stored in Supabase PostgreSQL with Row Level Security
- **Unauthenticated Users**: Data is stored in browser localStorage for immediate use

#### Database Schema

The database includes tables for:
- **`personal_details`** - Contact information and professional profiles
- **`experience`** - Work history with AI-generated bullet points
- **`projects`** - Project showcase with technology highlighting
- **`education`** - Academic background and certifications
- **`skills`** - Extracted and categorized skills
- **`app_settings`** - User preferences and AI model settings

#### Local Development Commands

```bash
# Stop local Supabase services
npx supabase stop

# Reset local database (deletes all data) and apply pending migrations
npx supabase db reset

# View database in Supabase Studio
npx supabase start
# Open http://localhost:54323 in browser

# Apply database migrations
npx supabase migration up

# Generate new migration from schema changes
npx supabase db diff --file new_migration

# Create a new migration file
npx supabase migration new <name>

# Regenerate types after schema changes (only needed if you modify the migration)
npx supabase gen types typescript --local > src/lib/types/database.ts
```

## How to Use

### Welcome Experience (First-Time Users)
New users are guided through a 5-step onboarding process with personalized content:
1. **Welcome Screen**: Introduction to ResuMint's features
2. **Personal Details**: Name and email
3. **Experience & Projects**: Add initial work experience or project
4. **Education** (Optional): Academic background
5. **Job Description**: Paste target job posting for AI optimization, skill extraction, and bullet generation

### Building Your Resume
1. **Enter Job Description**: Paste a job posting for AI analysis and keyword extraction
2. **Input Personal Details**: Add contact information and professional profiles  
3. **Build Your Resume**: Add work experience, projects, and education with drag-and-drop organization

### AI-Powered Features
4. **Automatic Skill Detection**: Skills are extracted from your experience and projects, and intelligently categorized based on job requirements
5. **Skill Suggestions**: AI suggests relevant skills based on your experience and job analysis
6. **Keyword Optimization**: The system tracks keyword usage and prioritizes underused skills (In development)
7. **Smart Bullet Generation**: AI creates targeted bullet points emphasizing relevant keywords

### Customization & Export
1. **Real-time Preview**: Watch your resume update automatically as you make changes
2. **Customize Settings**: Adjust bullet point counts, character limits, and AI model preferences, and order of resume sections
3.  **Download PDF**: Generate and save your optimized resume

## Architecture

ResuMint uses a modern, scalable Next.js architecture with intelligent caching and state management:

### Core Architecture
- **App Router**: Handles routing and API endpoints with TypeScript
- **Component Architecture**: Feature-based organization with shared utilities
- **Type Safety**: Comprehensive TypeScript with Zod validation schemas
- **Styling**: SASS modules with comprehensive mixin system for consistency

### State Management Architecture

ResuMint uses a modern Zustand-based architecture that eliminates prop drilling and provides clean separation of concerns:

#### **Clean Data Flow Pattern**
```
UI Layer → Action Layer → Store Layer → Persistence Layer
```

- **UI Layer**: Components handle user interaction and presentation
- **Action Layer**: Pure validation functions with no side effects
- **Store Layer**: Global state management with smart loading states
- **Persistence Layer**: Data caching and localStorage operations

#### **Zustand Store Features**
- **Single Source of Truth**: Each data type has one global store (personalDetails, settings, etc.)
- **Smart Loading States**: 
  - `initializing: boolean` - Shows skeleton during first load only
  - `loading: boolean` - Shows subtle feedback during operations
- **Error Recovery**: Automatic state restoration on save failures
- **Cache Integration**: Seamless integration with dataManager for persistence
- **Direct Access**: No prop drilling - any component can access stores directly

#### **Store Provider Pattern**
- **Centralized Initialization**: All stores initialized in root layout via `StoreProvider`
- **Automatic Setup**: Stores auto-initialize on app start
- **Performance Optimized**: Stores only load data when first accessed
- **Type Safety**: Full TypeScript support with proper type inference

#### **Migration Pattern for New Data Types**
Adding new data types follows a consistent pattern:

1. **Create Store**: `src/stores/newDataStore.ts` with standard interface
2. **Add to Provider**: Include in `StoreProvider.tsx` initialization
3. **Create Actions**: Pure validation functions in `src/lib/actions/`
4. **Update Components**: Use store hooks directly, no prop drilling
5. **Extend DataManager**: Add persistence methods if needed

This pattern ensures consistency and maintainability as the application scales.

#### **Architecture Benefits**
- **Eliminated Dual State Issues**: No more duplicate hook instances
- **Scalable**: Easy to add new data types with consistent patterns
- **Maintainable**: Clear separation of concerns across all layers
- **Performant**: Smart caching and minimal re-renders
- **Robust**: Multiple error handling layers with state recovery

### Data Flow Example: Personal Details

Here's how data flows through the architecture when a user submits personal details:

1. **UI Layer**: `PersonalDetails.tsx` handles form submission
2. **Action Layer**: `personalDetailsActions.ts` validates form data (pure function)
3. **Store Layer**: `personalDetailsStore.ts` manages state and calls persistence
4. **Persistence Layer**: `dataManager.ts` handles caching and localStorage operations

```typescript
// Component orchestrates the flow
const [state, formAction] = useActionState(async (prevState, formData) => {
  const result = await submitPersonalDetails(prevState, formData)
  if (result.success) {
    await store.save(result.data)  // Store handles state + persistence
  }
  return result
})
```

This pattern ensures:
- **Predictable data flow**: Always UI → Action → Store → Persistence
- **Single responsibility**: Each layer has one clear purpose
- **Error isolation**: Failures are contained and handled at appropriate layers
- **Testability**: Pure functions and clear interfaces

### User Experience Layer
- **Welcome Experience**: Progressive onboarding with smart step navigation and completion tracking
- **Loading States**: Skeleton components using design system mixins for consistent shimmer effects
- **Data Management**: Zustand stores with intelligent loading states for seamless UX

### AI & Processing Pipeline
- **Job Analysis**: Extracts keywords, skills, and requirements from job descriptions
- **Keyword Management**: Tracks usage statistics and prioritizes underused skills
- **Bullet Generation**: Context-aware AI prompting with keyword prioritization
- **Skill Processing**: Automatic skill extraction, intelligent categorization, and AI-powered skill suggestions

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
- **Skeleton Loading**: Mixin-based loading states automatically sync with design system changes
- **Zustand State Management**: Global stores eliminate prop drilling

## Project Structure

```
resu-mint/
├── public/              # Static assets and icons
├── scripts/             # Build scripts (Tectonic download)
├── src/
│   ├── stores/          # Zustand global state stores
│   │   ├── index.ts                 # Store exports and hooks
│   │   ├── StoreProvider.tsx        # Centralized store initialization
│   │   ├── authStore.ts             # Authentication state management
│   │   ├── personalDetailsStore.ts  # Personal details state management
│   │   └── settingsStore.ts         # Application settings state
│   ├── app/             # App Router pages and API routes
│   │   ├── admin/           # Admin dashboard for system monitoring
│   │   ├── login/           # Authentication page with signup/login
│   │   ├── api/             # AI and PDF generation endpoints
│   │   │   ├── analyze-job-description/    # Job analysis
│   │   │   ├── generate-bullets/           # AI bullet generation
│   │   │   ├── create-pdf/                 # PDF generation
│   │   │   ├── extract-user-skills/        # Skill extraction from user content
│   │   │   ├── categorize-user-skills/     # Intelligent skill categorization
│   │   │   ├── generate-skill-suggestions/ # AI-powered skill suggestions
│   │   │   └── tectonic-health/            # System health monitoring
│   │   ├── globals.scss     # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main application page
│   ├── components/      # React components
│   │   ├── FormsContainer/  # Main application container
│   │   ├── ResumePreview/   # Live PDF preview
│   │   ├── WelcomeExperience/ # 5-step onboarding flow
│   │   │   ├── WelcomeStep/       # Feature introduction
│   │   │   ├── PersonalDetailsStep/ # Contact details collection
│   │   │   ├── ExperienceProjectsStep/ # Initial content creation
│   │   │   ├── EducationStep/     # Academic background (optional)
│   │   │   └── JobDescriptionStep/ # Job targeting
│   │   ├── JobDescription/  # Job analysis interface
│   │   ├── PersonalDetails/ # Contact information
│   │   ├── Experience/      # Work history with drag-and-drop
│   │   ├── Projects/        # Project showcase
│   │   ├── Education/       # Academic background
│   │   ├── Skills/          # Skill management
│   │   ├── Settings/        # Application preferences
│   │   └── shared/          # Shared UI components
│   │       ├── LoadingSpinner/  # Configurable loading indicators
│   │       ├── Skeleton/        # Loading state components
│   │       ├── BulletPoint/     # Interactive bullet point management
│   │       └── LongPressHandler/ # Mobile interaction handler
│   ├── lib/             # Core utilities and services
│   │   ├── actions/         # Pure validation functions (no side effects)
│   │   │   ├── loginActions.ts           # Authentication form validation
│   │   │   ├── personalDetailsActions.ts # Personal details validation
│   │   │   ├── experienceActions.ts      # Experience form validation
│   │   │   ├── projectActions.ts         # Project form validation
│   │   │   ├── educationActions.ts       # Education form validation
│   │   │   └── settingsActions.ts        # Settings form validation
│   │   ├── supabase/        # Supabase configuration and clients
│   │   │   ├── client.ts                 # Browser client for authentication
│   │   │   └── server.ts                 # Server client for admin operations
│   │   ├── ai/              # AI prompts and tools
│   │   ├── data/            # Data persistence layer
│   │   │   └── dataManager.ts            # Intelligent caching + localStorage operations
│   │   ├── services/        # API and business logic
│   │   │   ├── livePreviewService.ts  # PDF preview management
│   │   │   ├── api.ts                 # HTTP client
│   │   │   ├── bulletService.ts       # Bullet generation
│   │   │   ├── jobDetailsService.ts   # Job analysis and parsing
│   │   │   └── skillsService.ts       # Skill extraction, categorization, and suggestions
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useKeywordAnalysis.ts # Keyword tracking and analysis
│   │   │   ├── useExperience.ts      # Experience data hook (legacy)
│   │   │   ├── useMobile.ts         # Mobile device detection
│   │   │   └── useAutoResizeTextarea.ts # Auto-resizing textarea utility
│   │   ├── types/           # TypeScript definitions
│   │   │   ├── api.ts       # API request/response types
│   │   │   ├── auth.ts      # Authentication form types
│   │   │   ├── database.ts  # Supabase database types (generated)
│   │   │   ├── keywords.ts  # Keyword analysis types
│   │   │   ├── admin.ts     # Admin dashboard types
│   │   │   ├── experience.ts, projects.ts, education.ts
│   │   │   └── settings.ts, personalDetails.ts, errors.ts
│   │   ├── template/        # LaTeX resume templates
│   │   ├── keywordUtils.ts  # Keyword analysis utilities
│   │   ├── clientUtils.ts   # Client-side utilities
│   │   ├── utils.ts         # General utilities
│   │   ├── constants.ts     # Application constants
│   │   └── validationSchemas.ts # Zod validation schemas
│   ├── middleware.ts    # Next.js middleware for route protection
│   └── styles/          # SASS styles and variables
├── supabase/            # Supabase configuration and migrations
│   ├── config.toml              # Local Supabase configuration
│   ├── migrations/              # Database migration files
│   │   └── 20250803234543_create_resume_tables.sql
│   └── .gitignore               # Supabase-specific gitignore
├── .env.local           # Environment variables
├── next.config.ts       # Next.js configuration
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## API Endpoints

- **POST /api/analyze-job-description** - Analyzes job postings and extracts keywords
- **POST /api/generate-bullets** - Creates AI-powered bullet points for experiences/projects
- **POST /api/create-pdf** - Generates LaTeX-based PDF resumes
- **POST /api/extract-user-skills** - Extracts skills from user descriptions and content
- **POST /api/categorize-user-skills** - Intelligently categorizes skills based on job requirements
- **POST /api/generate-skill-suggestions** - Suggests relevant skills based on user experience and job analysis
- **GET/POST /api/tectonic-health** - System health monitoring and cache management

## Admin Dashboard

Access `/admin/dashboard` for system monitoring including:
- **Tectonic Binary Status**: Verify PDF generation capabilities
- **Cache Management**: Monitor build cache (persistent) and runtime cache performance
- **Performance Metrics**: Track PDF generation speeds and cache effectiveness

## Future Enhancements

### Data & Storage
- **Data Migration Tools**: Migrate localStorage data to database for new authenticated users
- **Version History**: Track and restore previous resume versions
- **Data Export/Import**: Allow users to export/import their data

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
- [Zustand](https://zustand-demo.pmnd.rs/) for lightweight and intuitive state management

## Contact

For inquiries, commercial licensing, or to view a live demo, contact me at [btnk.nik@gmail.com](mailto:btnk.nik@gmail.com).

---

*Built with ❤️ and AI to help you land your dream job.*
