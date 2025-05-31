# Tasks: Required Email Pre-Interview Feature

## Phase 1: Backend - Session & Email Handling

- [ ] Update Session Metadata Schema
  - [ ] Review existing schema in `lib/types/session.ts`
  - [ ] Verify email, elevenlabsConversationId, and results_email_sent fields exist
  - [ ] Add any missing TypeScript types/interfaces
  - [ ] Update relevant type imports across the codebase

- [ ] Implement Session Start API
  - [ ] Create `app/api/sessions/start/route.ts`
    - [ ] Implement email validation logic
    - [ ] Add UUID generation for sessionId
    - [ ] Set up MongoDB connection and document creation
    - [ ] Add error handling and logging
  - [ ] Write unit tests for the endpoint
    - [ ] Test email validation
    - [ ] Test session creation
    - [ ] Test error cases

- [ ] Implement ElevenLabs ID Mapping API
  - [ ] Create `app/api/sessions/map-elevenlabs-id/route.ts`
    - [ ] Implement session lookup logic
    - [ ] Add MongoDB update operation
    - [ ] Add error handling and logging
  - [ ] Write unit tests for the endpoint
    - [ ] Test successful mapping
    - [ ] Test session not found case
    - [ ] Test error cases

- [ ] Refactor Email Service
  - [ ] Create/Update `lib/emailService.ts`
    - [ ] Extract reusable email sending logic
    - [ ] Implement `sendResultsEmail` function
    - [ ] Add error handling and logging
  - [ ] Write unit tests for email service
    - [ ] Test email formatting
    - [ ] Test sending logic
    - [ ] Test error cases

- [ ] Update Scoring Service
  - [ ] Modify post-scoring logic in job processor
    - [ ] Add email result sending logic
    - [ ] Implement results_email_sent flag update
    - [ ] Add error handling and logging
  - [ ] Update unit tests
    - [ ] Test email sending trigger
    - [ ] Test flag updates
    - [ ] Test error cases

## Phase 2: Frontend - Pre-Interview Page & Routing

- [ ] Create Start Page
  - [ ] Create `app/start/page.tsx`
    - [ ] Implement email input form component
    - [ ] Add client-side email validation
    - [ ] Style form with pill design
    - [ ] Add loading states
    - [ ] Add error states
  - [ ] Write component tests
    - [ ] Test form validation
    - [ ] Test submission flow
    - [ ] Test error handling

- [ ] Implement Form Logic
  - [ ] Add form state management
    - [ ] Implement email validation
    - [ ] Add loading state handling
    - [ ] Add error state handling
  - [ ] Implement API integration
    - [ ] Add session start API call
    - [ ] Handle success/error responses
    - [ ] Implement navigation logic

- [ ] Add Route Prefetching
  - [ ] Implement interview page prefetching
    - [ ] Add prefetch on email input focus
    - [ ] Add prefetch on form hover
  - [ ] Test prefetching behavior
    - [ ] Verify timing
    - [ ] Check bundle loading

- [ ] Update Landing Page
  - [ ] Modify `app/page.tsx`
    - [ ] Update CTA to link to /start
    - [ ] Update any related copy
  - [ ] Test navigation flow

## Phase 3: Frontend - Interview Page Adaptations

- [ ] Modify Conversation Component
  - [ ] Update `Conversation.tsx`
    - [ ] Remove automatic initialization
    - [ ] Add explicit start mechanism
    - [ ] Add ElevenLabs ID capture logic
  - [ ] Write/update component tests
    - [ ] Test deferred initialization
    - [ ] Test ID mapping
    - [ ] Test error cases

- [ ] Implement ID Mapping Logic
  - [ ] Add mapping API integration
    - [ ] Implement API call on session start
    - [ ] Add error handling
    - [ ] Add retry logic if needed
  - [ ] Write integration tests
    - [ ] Test successful mapping
    - [ ] Test error cases

- [ ] Update Interview Page
  - [ ] Modify `/interview/[sessionId]/page.tsx`
    - [ ] Add session orchestration logic
    - [ ] Implement ElevenLabs start trigger
    - [ ] Add error handling
  - [ ] Write page tests
    - [ ] Test initialization flow
    - [ ] Test error cases

## Phase 4: Testing, Error Handling & Polish

- [ ] End-to-End Testing
  - [ ] Write E2E test suite
    - [ ] Test complete user flow
    - [ ] Test error scenarios
    - [ ] Test performance metrics
  - [ ] Set up monitoring
    - [ ] Add performance tracking
    - [ ] Set up error tracking
    - [ ] Configure analytics

- [ ] Error State Implementation
  - [ ] Add error handling
    - [ ] Implement user-friendly error messages
    - [ ] Add error recovery flows
    - [ ] Test error scenarios

- [ ] Performance Verification
  - [ ] Measure key metrics
    - [ ] Test start-to-interview time
    - [ ] Verify prefetch effectiveness
    - [ ] Check API response times
  - [ ] Optimize if needed
    - [ ] Review bundle sizes
    - [ ] Check API performance
    - [ ] Optimize animations

- [ ] Final Acceptance Testing
  - [ ] Verify PRD requirements
    - [ ] Check email collection
    - [ ] Verify session creation
    - [ ] Test result delivery
  - [ ] Review logging
    - [ ] Verify log coverage
    - [ ] Check log quality
    - [ ] Test log aggregation

## Relevant Files

### New Files to Create:
- `app/api/sessions/start/route.ts`
- `app/api/sessions/map-elevenlabs-id/route.ts`
- `app/start/page.tsx`
- `lib/emailService.ts` (if not existing)

### Files to Modify:
- `lib/types/session.ts`
- `app/page.tsx`
- `app/interview/[sessionId]/page.tsx`
- `components/Conversation.tsx`
- `lib/jobProcessor.ts` 