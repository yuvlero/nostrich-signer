# Nostrich Signer - Nostr Event Signer Application

## Overview

This is a standalone Node.js + React application that functions as a Nostr signer, designed to communicate with the Nostrich authentication server at auth.nostrich.pro. The application provides QR code scanning capabilities, private key management, and local event signing for Nostr Wallet Connect authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **UI Components**: Radix UI primitives for accessible, unstyled components
- **State Management**: React hooks with localStorage for persistence
- **Routing**: Wouter for lightweight client-side routing
- **Data Fetching**: TanStack Query for server state management

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Database Connection**: Neon Database serverless PostgreSQL
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **Development**: Hot module replacement via Vite integration

### Build and Development
- **TypeScript**: Full TypeScript support across client and server
- **Module System**: ESM (ES Modules) throughout the stack
- **Development Server**: Vite dev server with Express backend integration
- **Production Build**: Separate client (Vite) and server (esbuild) builds

## Key Components

### Core Functionality Components

#### QR Scanner (`QRScanner.tsx`)
- **Purpose**: Camera-based QR code scanning using jsQR library and manual URI input
- **Features**: Flash support, permission handling, real-time scanning, paste URI dialog
- **Problem Solved**: Enables scanning of Nostr Wallet Connect URIs from mobile apps or manual input for camera issues
- **Technology Choice**: jsQR chosen for browser compatibility and no external dependencies
- **Recent Update**: Added "Paste Link" button for manual NWC URI entry, removed empty camera view

#### Key Management (`KeyManagement.tsx`)
- **Purpose**: Generate, import, export, and manage Nostr private keys
- **Features**: Key generation, import from hex/nsec, export to file, secure deletion
- **Storage**: localStorage for client-side key persistence
- **Security Consideration**: Keys stored locally to maintain user control

#### Nostr Integration (`lib/nostr.ts`)
- **Purpose**: Handle Nostr protocol operations
- **Dependencies**: nostr-tools for event signing, @noble/hashes for cryptography
- **Features**: Key generation, event signing, NWC URI parsing
- **Design Choice**: Local signing ensures private keys never leave the browser

### UI Framework Components

#### shadcn/ui Components
- **Purpose**: Consistent, accessible UI component library
- **Components**: Buttons, dialogs, forms, toasts, and input components
- **Design System**: Built on Radix UI primitives with Tailwind CSS styling
- **Rationale**: Provides professional UI with accessibility built-in

### Storage and Persistence

#### Local Storage (`lib/storage.ts`)
- **Keys Storage**: Encrypted private keys with public key derivation
- **Settings Storage**: User preferences (auto-scan, detailed logs, server URL)
- **Server Configuration**: Development environment defaults to custom server, production uses auth.nostrich.pro
- **Design Choice**: Client-side storage for privacy and offline capability

## Data Flow

### QR Code to Event Signing Flow
1. **QR Scan**: Camera captures QR code containing NWC URI
2. **URI Parsing**: Extract challengeId, relay, and secret from URI
3. **Event Creation**: Generate Nostr event with challenge response
4. **Local Signing**: Sign event using stored private key
5. **Server Communication**: POST signed event to auth.nostrich.pro
6. **Response Handling**: Display success/error status to user

### Key Management Flow
1. **Key Generation**: Create new Nostr key pair using cryptographically secure random
2. **Storage**: Save keys to localStorage with error handling
3. **Import/Export**: Support multiple key formats (hex, nsec, file)
4. **Validation**: Verify key format and derivation before storage

## External Dependencies

### Nostr Protocol Libraries
- **nostr-tools**: Event creation, signing, and key management
- **@noble/hashes**: Cryptographic hashing functions
- **Rationale**: Standard libraries in Nostr ecosystem, well-maintained and secure

### UI and Utility Libraries
- **@radix-ui/***: Headless UI components for accessibility
- **class-variance-authority**: Type-safe CSS class variants
- **clsx**: Conditional CSS class composition
- **cmdk**: Command palette component
- **date-fns**: Date manipulation utilities

### Camera and QR Code
- **jsqr**: QR code detection from camera stream
- **Alternative Considered**: ZXing, but jsQR is lighter and browser-native

### Development Dependencies
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight routing
- **@hookform/resolvers**: Form validation integration

## Deployment Strategy

### Production Build Process
1. **Client Build**: Vite builds React app to `dist/public`
2. **Server Build**: esbuild bundles Node.js server to `dist/index.js`
3. **Static Serving**: Express serves built client files
4. **Environment Variables**: DATABASE_URL required for PostgreSQL connection

### Database Strategy
- **Development**: Local PostgreSQL or Neon Database
- **Production**: Neon Database serverless PostgreSQL
- **Migrations**: Drizzle Kit handles schema migrations
- **Connection**: Connection pooling via @neondatabase/serverless

### Server Integration
- **API Routes**: Express routes under `/api` prefix
- **Proxy Endpoint**: `/api/publish-event` proxies requests to auth.nostrich.pro to avoid CORS issues
- **Static Files**: Client build served from `/dist/public`
- **Development**: Vite middleware integration for HMR
- **Production**: Pre-built static files served directly

### Security Considerations
- **Key Storage**: Private keys never leave the browser
- **HTTPS**: Required for camera access and secure communication
- **CORS**: Configured for auth.nostrich.pro communication
- **Input Validation**: Zod schemas for type-safe validation

The application follows a privacy-first approach where sensitive cryptographic operations happen client-side, while the server primarily handles static file serving and potential future API endpoints for non-sensitive operations.