# HushKey Vault - Technology Stack

## Programming Languages and Versions
- **TypeScript**: ~5.8.2 (Primary language for type safety)
- **JavaScript**: ES Modules (via TypeScript compilation)
- **HTML5**: Application shell and templates
- **CSS**: Component styling (method TBD from component analysis)

## Core Framework and Libraries
- **React**: ^19.2.0 (Latest version with modern features)
- **React DOM**: ^19.2.0 (DOM rendering)
- **React Router DOM**: ^7.9.6 (Client-side routing)

## UI and Visualization
- **Lucide React**: ^0.554.0 (Icon library)
- **Recharts**: ^3.5.0 (Data visualization and analytics charts)

## Build System and Development Tools
- **Vite**: ^6.2.0 (Fast build tool and development server)
- **@vitejs/plugin-react**: ^5.0.0 (React integration for Vite)
- **@types/node**: ^22.14.0 (Node.js type definitions)

## Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Configuration
- **GEMINI_API_KEY**: Required API key for AI Studio integration
- **Environment File**: .env.local for local development variables

## Project Configuration
- **Module System**: ES Modules (type: "module" in package.json)
- **TypeScript Config**: Strict type checking enabled
- **Build Target**: Modern browsers with ES modules support
- **Development Server**: Vite dev server with hot module replacement

## External Integrations
- **AI Studio**: Connected to Google AI Studio platform
- **Gemini API**: AI-powered features integration