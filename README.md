# ResuMint: AI-Powered Resume Builder

## Overview

ResuMint is a modern web application that uses AI to create tailored, ATS-friendly resumes optimized for specific job descriptions. Powered by OpenAI's language models and built with Next.js, ResuMint automates resume customization with intelligent keyword analysis, generating bullet points that highlight your relevant skills and experiences. It produces professional PDF resumes using LaTeX and Tectonic, with real-time live preview capabilities ensuring clean formatting and precise typography.

This project is public, with a custom license allowing personal use and forks for non-commercial purposes. It includes user authentication with Supabase, and I plan to introduce premium features (e.g., advanced templates, analytics) for commercial use in the future.

## Key Features

### Authentication & Data Management
- **Local-First Architecture**: PGlite local database with ElectricSQL real-time sync to Supabase
- **User-Scoped Data Isolation**: Changelog-based sync with user ID filtering prevents cross-user contamination
- **Secure Authentication**: Email/password with Supabase Auth, Row Level Security, and session persistence
- **Anonymous User Support**: Logged-out editing with automatic data transfer on first login

### AI-Powered Resume Creation
- **Intelligent Bullet Generation**: Creates tailored bullet points matching job descriptions using OpenAI's GPT models
- **Job Description Analysis**: Extracts key skills, requirements, and context from job postings
- **Smart Skill Management**: Automatic extraction, intelligent categorization, suggestion system, and keyword prioritization

### PDF Generation & Preview
- **Automatic Preview**: PDF preview with debounced updates during editing
- **Advanced Caching**: Multi-tier caching system (memory + localStorage) for optimal performance
- **LaTeX PDF Generation**: Produces ATS-friendly PDFs with Tectonic for professional output
- **Queue Management**: Handles multiple concurrent requests efficiently

### Comprehensive Resume Sections
- **Complete Resume Builder**: Personal details, work experience, projects, education, and skills with drag-and-drop organization and AI-generated content

### Smart User Experience
- **Instant Responsiveness**: Local-first data storage with background cloud sync
- **Modern Interface**: Drag-and-drop organization, mobile-responsive design, and consistent loading states
- **Global State Management**: Zustand stores with PGlite integration

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, SASS
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Database**: 
  - **Local**: PGlite (in-browser PostgreSQL) for local-first storage
  - **Remote**: Supabase PostgreSQL with TypeScript type generation
  - **Sync**: ElectricSQL for real-time read-path synchronization
- **AI Integration**: OpenAI API (GPT-4o mini, GPT-4) with tiktoken for token management
- **PDF Generation**: LaTeX with Tectonic for professional resume output  
- **UI Components**: dnd-kit for drag-and-drop, react-pdf for preview, react-icons
- **Validation**: Zod schemas for type-safe form validation
- **State Management**: Zustand for global state with PGlite local database persistence
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
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   
   # Local Supabase (from `supabase start` output)
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
   SUPABASE_SECRET_KEY=your_service_role_key_here
   
   # ElectricSQL Configuration
   ELECTRIC_HTTP_BASE=http://localhost:3001
   ELECTRIC_SECRET=your_generated_secret_here_or_leave_empty_for_insecure
   ```

5. Start ElectricSQL sync service:

   **Option A: With Authentication (Recommended)**
   ```bash
   # Generate a secure secret (save this for your .env.local)
   openssl rand -base64 32
   
   # Run ElectricSQL with authentication
   docker run -it \
     -e "DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres" \
     -e "ELECTRIC_SECRET=YOUR_GENERATED_SECRET_HERE" \
     -p 3001:3000 \
     electricsql/electric:latest
   ```

   **Option B: Without Authentication (Development Only)**
   ```bash
   docker run -it \
     -e "DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres" \
     -e "ELECTRIC_INSECURE=true" \
     -p 3001:3000 \
     electricsql/electric:latest
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) to view the app.

### Database Management

The app uses **ElectricSQL local-first architecture** with PGlite (in-browser PostgreSQL) for instant access and real-time sync to Supabase. User-scoped changelog tables prevent cross-user data contamination, and anonymous users get automatic data transfer on first login.

#### Database Schema

**Cloud Tables (Supabase):**
- `personal_details`, `experience`, `projects`, `education`, `skills`, `app_settings`

**Local Tables (PGlite):**
- `personal_details_changes` - Changelog for user-scoped sync with conflict resolution

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

# Start ElectricSQL sync service (see installation steps above for detailed options)
# With auth: docker run -it -e "DATABASE_URL=..." -e "ELECTRIC_SECRET=..." -p 3001:3000 electricsql/electric:latest
# Without auth: docker run -it -e "DATABASE_URL=..." -e "ELECTRIC_INSECURE=true" -p 3001:3000 electricsql/electric:latest
```

## How to Use

### Welcome Experience (First-Time Users)
*Note: Welcome experience is temporarily disabled during ElectricSQL migration completion.*

The guided 5-step onboarding process includes:
1. **Welcome Screen**: Introduction to ResuMint's features
2. **Personal Details**: Name and email
3. **Experience & Projects**: Add initial work experience or project
4. **Education** (Optional): Academic background
5. **Job Description**: Paste target job posting for AI optimization, skill extraction, and bullet generation

### Building Your Resume
1. **Enter Job Description**: Paste a job posting for AI analysis and keyword extraction
2. **Build Content**: Add personal details, work experience, projects, and education with drag-and-drop organization
3. **AI Enhancement**: Automatic skill detection, suggestions, and smart bullet generation with keyword optimization
4. **Customize & Export**: Real-time preview, adjustable settings, and professional PDF generation

## Architecture

ResuMint uses a modern, scalable Next.js architecture with intelligent caching and state management:

### Core Architecture
- **App Router**: Handles routing and API endpoints with TypeScript
- **Component Architecture**: Feature-based organization with shared utilities
- **Type Safety**: Comprehensive TypeScript with Zod validation schemas
- **Styling**: SASS modules with comprehensive mixin system for consistency

### State Management Architecture

ResuMint uses local-first architecture with ElectricSQL sync and Zustand state management for clean separation of concerns:

#### **Clean Data Flow Pattern**
```
UI Layer → Action Layer → Store Layer → Persistence Layer
```

- **UI Layer**: Components handle user interaction and presentation
- **Action Layer**: Pure validation functions with no side effects
- **Store Layer**: Global state management with smart loading states
- **Persistence Layer**: PGlite local database with ElectricSQL cloud sync

#### **Zustand Store Features**
- **Single Source of Truth**: Each data type has one global store with smart loading states
- **Error Recovery**: Automatic state restoration on save failures
- **PGlite Integration**: Direct local database queries with ElectricSQL sync

#### **Store Provider Pattern**
- **Centralized Initialization**: All stores initialized in root layout with auto-setup and TypeScript support

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
4. **Persistence Layer**: `personalDetailsManager.ts` handles PGlite database operations with ElectricSQL sync

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

### User Experience & AI Pipeline
- **Instant Responsiveness**: Local-first data storage with background cloud sync and real-time synchronization
- **AI Processing**: Job analysis, skill extraction, keyword management, and context-aware bullet generation

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

- **Live Preview**: Debounced PDF generation with request queue management and local storage caching
- **Smart Caching**: Automated cache warming, environment adaptation, and deployment integration
- **Real-Time Sync**: ElectricSQL database synchronization with conflict resolution

## API Endpoints

- **POST /api/analyze-job-description** - Analyzes job postings and extracts keywords
- **POST /api/generate-bullets** - Creates AI-powered bullet points for experiences/projects
- **POST /api/create-pdf** - Generates LaTeX-based PDF resumes
- **POST /api/extract-user-skills** - Extracts skills from user descriptions and content
- **POST /api/categorize-user-skills** - Intelligently categorizes skills based on job requirements
- **POST /api/generate-skill-suggestions** - Suggests relevant skills based on user experience and job analysis
- **GET/POST /api/tectonic-health** - System health monitoring and cache management
- **GET/POST /api/shape-proxy** - ElectricSQL shape proxy for real-time database synchronization

## Admin Dashboard

Access `/admin/dashboard` for system monitoring including:
- **Tectonic Binary Status**: Verify PDF generation capabilities
- **Cache Management**: Monitor build cache (persistent) and runtime cache performance
- **Performance Metrics**: Track PDF generation speeds and cache effectiveness

## Future Enhancements

### Data & Storage
- **Complete ElectricSQL Migration**: Finish migrating all data types to local-first architecture
- **Version History**: Track and restore previous resume versions using changelog system
- **Enhanced Conflict Resolution**: Better handling for complex sync scenarios

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
