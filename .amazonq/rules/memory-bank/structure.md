# HushKey Vault - Project Structure

## Directory Organization

### Core Application Files
- **App.tsx**: Main application component and routing setup
- **index.tsx**: Application entry point and React DOM rendering
- **index.html**: HTML template and application shell
- **types.ts**: Global TypeScript type definitions

### Component Architecture
- **components/**: Reusable UI components
  - **icons/**: Custom icon components
  - **layout/**: Layout-specific components (Layout.tsx)
  - **modals/**: Modal dialogs (ConfirmationModal, ShareModal, VaultModal)
- **pages/**: Route-based page components
  - **Dashboard.tsx**: Main dashboard with analytics
  - **Items.tsx**: Item listing and management
  - **ItemDetail.tsx**: Individual item details and editing
  - **Login.tsx**: Authentication interface
  - **Settings.tsx**: User preferences and configuration
  - **Guardian.tsx**: Enhanced security mode
  - **Trash.tsx**: Deleted items management
  - **dashboard/**: Dashboard-specific sub-components
  - **items/**: Item-related sub-components

### Business Logic Layer
- **services/**: Core business logic and data operations
  - **storage.ts**: Data persistence and retrieval
  - **passwordGenerator.ts**: Password generation utilities
  - **mockData.ts**: Development and testing data
- **contexts/**: React context providers for state management
- **hooks/**: Custom React hooks for shared logic

### Configuration and Utilities
- **constants/**: Application constants and configuration
- **routing/**: Navigation and route definitions
- **types/**: Additional type definitions organized by domain

### Build and Development
- **vite.config.ts**: Vite build configuration
- **tsconfig.json**: TypeScript compiler configuration
- **package.json**: Dependencies and build scripts
- **.env.local**: Environment variables (API keys, etc.)

## Architectural Patterns
- **Component-Based Architecture**: React functional components with hooks
- **Service Layer Pattern**: Separation of business logic from UI components
- **Context Pattern**: Global state management using React Context
- **Route-Based Code Splitting**: Pages organized by application routes
- **Modal Pattern**: Centralized modal management for user interactions