# HushKey Vault - Development Guidelines

## Code Quality Standards

### TypeScript Usage
- **Strict Type Safety**: All files use TypeScript with comprehensive type definitions
- **Interface-First Design**: Complex data structures defined as interfaces (Item, Vault, UserProfile)
- **Enum Usage**: String enums for constants (ItemType, NotificationType, AccentColor)
- **Union Types**: Used for flexible type definitions (AccentColor, theme settings)
- **Generic Constraints**: Type-safe data handling across different item types

### Import Organization
- **React Imports First**: React and React hooks imported at the top
- **Third-Party Libraries**: Router, external libraries follow React imports
- **Internal Imports**: Types, services, components imported in logical order
- **Relative Imports**: Consistent use of relative paths (../types, ../services)

### Component Structure Patterns
- **Functional Components**: All components use React.FC with TypeScript
- **Props Interface**: Each component defines its own props interface
- **Default Props**: Optional props handled with default values or conditional rendering
- **Component Composition**: Complex components broken into smaller, reusable pieces

## Architectural Patterns

### Context Pattern Implementation
- **Separation of Concerns**: AuthContext and DataContext handle distinct responsibilities
- **Custom Hooks**: useAuth() and useData() provide clean context access
- **Provider Composition**: Nested providers with proper dependency management
- **Context Validation**: Error throwing when contexts used outside providers

### State Management Conventions
- **useState for Local State**: Component-level state using React hooks
- **useEffect for Side Effects**: Proper dependency arrays and cleanup
- **useMemo for Performance**: Computed values cached with dependency tracking
- **useCallback for Functions**: Event handlers and functions memoized appropriately

### Service Layer Architecture
- **Storage Service**: Centralized localStorage operations with consistent key naming
- **Business Logic Separation**: Password generation, TOTP logic in dedicated services
- **Mock Data Management**: Development data separated from production logic
- **Error Handling**: Try-catch blocks for crypto operations and external APIs

## Styling and UI Patterns

### Tailwind CSS Conventions
- **Utility-First Approach**: Extensive use of Tailwind utility classes
- **Responsive Design**: Mobile-first responsive patterns (md:, lg: prefixes)
- **Color System**: Consistent color palette with primary/secondary variants
- **Component Variants**: Conditional styling based on component state

### Dynamic Styling Patterns
- **Conditional Classes**: Template literals for dynamic class application
- **State-Based Styling**: Visual feedback for editing/viewing modes
- **Theme Integration**: CSS custom properties for accent color theming
- **Animation Classes**: Transition and transform utilities for smooth interactions

## Data Handling Patterns

### CRUD Operations
- **Immutable Updates**: State updates using spread operators and array methods
- **Soft Delete Pattern**: Items marked as deleted rather than removed
- **Audit Trail**: All operations logged with timestamps and details
- **Optimistic Updates**: UI updates immediately, then persisted to storage

### Type Safety in Data Operations
- **Generic Item Interface**: Single Item interface with union of all data types
- **Type Guards**: Runtime type checking for different item types
- **Null Safety**: Consistent handling of optional fields with fallbacks
- **Data Validation**: Input validation before state updates

## Security Implementation Patterns

### Authentication Flow
- **Protected Routes**: Route-level authentication checks
- **Session Management**: Authentication state managed in context
- **Biometric Integration**: Async biometric authentication with fallbacks
- **Login Attempt Tracking**: Failed login monitoring and reporting

### Data Security
- **Local Storage Encryption**: Sensitive data stored with encryption keys
- **Password Strength Validation**: Real-time password strength assessment
- **TOTP Implementation**: Standards-compliant time-based OTP generation
- **Clipboard Security**: Automatic clipboard clearing after copy operations

## Error Handling Standards

### Async Operation Handling
- **Promise-Based APIs**: Consistent async/await usage
- **Error Boundaries**: Component-level error catching and recovery
- **User Feedback**: Error states communicated through UI notifications
- **Graceful Degradation**: Fallback behavior when features unavailable

### Validation Patterns
- **Input Validation**: Real-time validation with user feedback
- **URL Validation**: Custom validation functions with error messaging
- **Form State Management**: Comprehensive form validation before submission
- **Data Integrity**: Checks for required fields and data consistency

## Performance Optimization

### React Performance
- **Memoization Strategy**: Strategic use of useMemo and useCallback
- **Component Splitting**: Large components broken into smaller pieces
- **Lazy Loading**: Route-based code splitting for better initial load
- **State Optimization**: Minimal re-renders through proper state structure

### Data Management
- **Efficient Filtering**: Computed properties for filtered data sets
- **Pagination Ready**: Data structures support future pagination
- **Memory Management**: Cleanup of event listeners and timers
- **Storage Optimization**: Efficient localStorage usage with size limits

## Testing and Development

### Development Patterns
- **Mock Data Integration**: Comprehensive mock data for development
- **Environment Configuration**: Proper environment variable handling
- **Debug Logging**: Console logging for development debugging
- **Hot Reload Support**: Vite configuration for fast development cycles

### Code Organization
- **Feature-Based Structure**: Components organized by feature/page
- **Shared Utilities**: Common functions in dedicated service files
- **Type Definitions**: Centralized type definitions in types.ts
- **Configuration Management**: Settings and constants properly externalized