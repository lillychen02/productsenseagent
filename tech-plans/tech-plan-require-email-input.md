# Tech Plan: Required Email Pre-Interview

## OVERVIEW
*(As previously defined)*

This feature will introduce a mandatory email collection step on a new `/start` page before a user can begin a product sense interview. The primary goals are to ensure 100% email capture for sending interview results (even if client-side processes fail post-interview), enable future user communication, and improve mapping between our internal sessions and ElevenLabs calls. This change aims for a seamless user experience with minimal added latency, targeting a <500ms transition from email submission to the interview starting.

Success will be measured by achieving 100% email capture for started interviews, maintaining or improving interview result delivery rates (target ≥95%), keeping the bounce rate on the new `/start` page below 10%, and ensuring the start-to-interview time remains under 500ms.

## ARCHITECTURE & APPROACH
*(As previously defined, including the plan to map ElevenLabs `conversation_id` post-connection and revised copy for the `/start` page CTA & microcopy)*

The core idea is to gate interview access behind an email submission page. Session creation will be moved server-side and triggered only after a valid email is provided. ElevenLabs SDK initialization will be deferred until the user lands on the actual interview page. Our internal `sessionId` will be generated first, and then associated with the ElevenLabs `conversation_id` once the voice session is established.

### 1. High-Level System Design

**Components & Data Flow:**

1.  **Landing Page (`/`):**
    *   "Get Started" button now navigates to `/start`.
2.  **Pre-Interview Page (`/start` - New):**
    *   **UI:** A new React component/page.
        *   Simple form with a "pill-style" email input field.
        *   CTA: "Start Interview".
        *   Microcopy: "Enter your email below. We'll send your full interview feedback directly to your inbox once it's ready!"
    *   **Logic:**
        *   Client-side email validation for immediate feedback.
        *   On submit, POST `{ email, rubricId, interviewType }` to `/api/sessions/start`.
            *   For the initial product sense interview, `rubricId` and `interviewType` can be defaulted on the client or server.
        *   On successful response (containing our internal `sessionId`), redirect to `/interview/[sessionId]`.
        *   Utilize Next.js prefetching for the `/interview/[sessionId]` route or an `/interview/template` shell.
3.  **API Endpoint (`/api/sessions/start` - New):**
    *   **Input:** `{ email: string, rubricId: string, interviewType: string }`.
    *   **Logic:**
        *   Perform server-side validation on the email.
        *   Generate a new internal `sessionId` (e.g., UUID v4).
        *   Create a new document in the `sessions_metadata` collection with:
            *   `sessionId` (our internal ID)
            *   `email`
            *   `rubricIdUsed: rubricId`
            *   `interviewType`
            *   `status: 'session_initiated'`
            *   `created_at`, `updated_at` timestamps.
        *   **Return:** `{ sessionId: string }` (our internal ID).
4.  **Interview Page (`/interview/[sessionId]` - Modified):**
    *   **Logic:**
        *   On page load/mount, extract our internal `sessionId` from URL.
        *   Initialize and start the ElevenLabs conversation (e.g., via `conversation.startSession()`).
        *   **Mapping ElevenLabs ID:** Once the ElevenLabs session is established and its `conversation_id` is available (e.g., via an SDK callback like `onConnect` or an event that provides this ID):
            *   Make an API call (e.g., `POST /api/sessions/map-elevenlabs-id`) with our internal `sessionId` and the `elevenlabsConversationId`.
            *   This new API endpoint will update the corresponding `sessions_metadata` document to store the `elevenlabsConversationId`.
        *   The `Conversation.tsx` component will be adapted to handle this deferred start and to expose the ElevenLabs `conversation_id` for mapping.
5.  **API Endpoint (`/api/sessions/map-elevenlabs-id` - New):**
    *   **Input:** `{ sessionId: string, elevenlabsConversationId: string }`.
    *   **Logic:**
        *   Update the `sessions_metadata` document where `sessionId` matches, adding/updating an `elevenlabsConversationId` field.
        *   Return success/failure.
6.  **Scoring Service (Backend - Modified):**
    *   Logic remains largely the same as previously described. After successful scoring:
        *   Fetch `SessionMetadata` using our internal `sessionId`.
        *   If `sessionMetadata.email` exists and `!sessionMetadata.results_email_sent`, call `sendResultsEmail(sessionId, sessionMetadata.email)`.
        *   Update `SessionMetadata` to set `results_email_sent: true`.
7.  **Session Metadata (`sessions_metadata` collection - Modified):**
    *   Will now include `email: string`.
    *   Will now include `elevenlabsConversationId: string` (populated after ElevenLabs call starts).
    *   Will include `results_email_sent: boolean`.

**State Management:**

*   **Client-side (`/start` page):** React local component state for email input, loading state, and inline validation errors.
*   **Server-side:** Session state, email, and ElevenLabs ID mapping handled by MongoDB (`sessions_metadata` collection).

### 2. Internal Services, Shared Components, Third-Party APIs

*   **Internal Services (Modified/Used):**
    *   `lib/mongodb.ts`
    *   `lib/logger.ts`
    *   `lib/scoringService.ts` (and its email triggering part)
    *   `lib/jobProcessor.ts`
    *   Existing/Refactored `sendResultsEmail` utility.
*   **Shared Components (New/Modified):**
    *   **New:** Email input form component for `/start`.
    *   **Modified:** `Conversation.tsx` (or its controller) to allow deferred start and to provide the ElevenLabs `conversation_id` once available.
*   **Third-Party APIs:** MongoDB, ElevenLabs, Resend, OpenAI.

### 3. Fit into Current App Architecture

*   This introduces a clear pre-interview step, decoupling email capture from the interview itself.
*   Session initiation is now explicitly server-driven via `/api/sessions/start`.
*   The mapping of our `sessionId` to `elevenlabsConversationId` ensures traceability.
*   The deferred start of ElevenLabs interaction is a key change to `Conversation.tsx`.

### 4. Alternatives Considered & Rejected

1.  **Using ElevenLabs `conversation_id` as the Primary `sessionId` from the Start:**
    *   **Description:** Attempt to generate our `sessionId` and pass it to ElevenLabs as its `conversation_id`.
    *   **Pros:** Simpler 1:1 ID match from the beginning.
    *   **Cons:** Relies on ElevenLabs SDK supporting custom conversation IDs. If not supported, or if the call to ElevenLabs fails before an ID is returned, we wouldn't have an ID for our pre-interview session record. The PRD implies our session is created *before* ElevenLabs is engaged.
    *   **Rejected Because:** It's safer to assume we cannot dictate ElevenLabs' primary session identifier. Generating our own `sessionId` first, then mapping to the ElevenLabs ID once it's available, is a more robust approach that ensures we always have an internal session record even if the ElevenLabs connection step later has issues. It also aligns better with creating our session record *after* email submission but *before* trying to connect to the voice AI.

---

## PHASED IMPLEMENTATION PLAN

### Phase 1: Backend - Session & Email Handling

*   **Goals:**
    *   Establish the data structures for storing email and linking session IDs.
    *   Create the API endpoint to initiate a session with an email.
    *   Create the API endpoint to map our internal `sessionId` to the ElevenLabs `conversation_id`.
    *   Modify `sessions_metadata` to accommodate the new fields.
*   **Key Tasks:**
    1.  **Modify `sessions_metadata` Schema (in `lib/types/session.ts` or equivalent type definitions):**
        *   Add `email: string` (optional at first, to be made required for new sessions).
        *   Add `elevenlabsConversationId: string` (optional).
        *   Add `results_email_sent: boolean` (optional, default false).
        *   Consider implications for existing documents (migration not strictly needed if new fields are optional, but new logic should handle their absence for old records).
    2.  **Create API Endpoint: `POST /api/sessions/start`:**
        *   Located at `app/api/sessions/start/route.ts`.
        *   Accepts `{ email: string, rubricId?: string, interviewType?: string }`. (Make `rubricId` and `interviewType` optional for now, defaulting to the primary product sense interview if not provided).
        *   Validate `email` format (server-side).
        *   Generate a unique internal `sessionId` (e.g., using `uuid`).
        *   Save a new entry to `sessions_metadata` with `sessionId`, `email`, `rubricIdUsed` (default if not provided), `interviewType` (default if not provided), `status: 'session_initiated'`, `created_at`, `updated_at`.
        *   Return `{ sessionId: string }`.
        *   Add comprehensive logging.
    3.  **Create API Endpoint: `POST /api/sessions/map-elevenlabs-id`:**
        *   Located at `app/api/sessions/map-elevenlabs-id/route.ts`.
        *   Accepts `{ sessionId: string, elevenlabsConversationId: string }`.
        *   Find the `sessions_metadata` document by our internal `sessionId`.
        *   Update it by setting the `elevenlabsConversationId` field.
        *   Return success/failure status.
        *   Add comprehensive logging.
    4.  **Refactor Email Sending Logic:**
        *   Ensure there's a reusable function, e.g., `sendResultsEmail(sessionId: string, userEmail: string)`, likely in `lib/emailService.ts` or by refactoring parts of `app/api/send-results/route.ts`.
        *   This function should:
            *   Fetch necessary report data (e.g., `StoredScore` for the `sessionId`).
            *   Format the email content (reuse existing templates from `lib/emailUtils.ts` or `emails/InterviewResults.tsx` rendering).
            *   Use Resend to send the email to `userEmail`.
            *   Log the attempt and outcome.
            *   *Does NOT update `results_email_sent` directly; that's the caller's responsibility.*
    5.  **Modify Scoring Service Post-Processing:**
        *   In the logic that handles a successfully completed scoring job (either in `lib/jobProcessor.ts` after `executeScoring` succeeds, or as the final step within `executeScoring` before returning):
            *   Fetch the `SessionMetadata` for the `sessionId`.
            *   If `sessionMetadata.email` exists AND `sessionMetadata.results_email_sent` is not `true`:
                *   Call `await sendResultsEmail(sessionId, sessionMetadata.email)`.
                *   If successful, update the `sessions_metadata` document to set `results_email_sent: true` and `updated_at`.
*   **Success Criteria:**
    *   [ ] `sessions_metadata` can store `email`, `elevenlabsConversationId`, and `results_email_sent`.
    *   [ ] `POST /api/sessions/start` successfully creates a session record with an email and returns a `sessionId`.
    *   [ ] `POST /api/sessions/map-elevenlabs-id` successfully updates a session record with the `elevenlabsConversationId`.
    *   [ ] Unit/integration tests pass for the new API endpoints.
    *   [ ] `sendResultsEmail` function is implemented and testable.
    *   [ ] Scoring completion correctly triggers `sendResultsEmail` if an email is present and not yet sent, and updates the `results_email_sent` flag.

### Phase 2: Frontend - Pre-Interview Page & Routing

*   **Goals:**
    *   Create the new `/start` page with the email capture form.
    *   Implement client-side validation and interaction.
    *   Connect the form to the new `/api/sessions/start` endpoint.
    *   Handle redirection to the interview page with prefetching.
    *   Update the main landing page CTA.
*   **Key Tasks:**
    1.  **Create `/start` Page Component:**
        *   File: `app/start/page.tsx`.
        *   UI:
            *   "Pill-style" email input field.
            *   "Start Interview" CTA button.
            *   Microcopy: "Enter your email below. We'll send your full interview feedback directly to your inbox once it's ready!" (or similar).
            *   Ensure responsive and mobile-friendly design.
    2.  **Implement Email Form Logic (`/start` page):**
        *   Client-side email validation (e.g., regex, non-empty).
        *   Show inline error messages for invalid email.
        *   Implement loading state for the "Start Interview" button during API call.
        *   On submit:
            *   Call `POST /api/sessions/start` with the email and default `rubricId`/`interviewType` for product sense.
            *   On success (receiving `sessionId`):
                *   Use Next.js `router.push` to navigate to `/interview/[sessionId]`.
            *   On failure: Display an error message (e.g., toast notification or inline message).
    3.  **Implement Prefetching:**
        *   On the `/start` page, when the email input gets focus or on hover of the submit button (or on page load if deemed non-impactful), use `router.prefetch('/interview/template')` or directly prefetch a generic version of the `/interview/[somePlaceholderId]` route if Next.js handles dynamic route prefetching effectively. The goal is to warm up the route.
        *   If an `/interview/template` shell is used, ensure it contains the common layout and static assets of the interview page.
    4.  **Update Landing Page (`/app/page.tsx`):**
        *   Change the main "Get Started" CTA to link/navigate to `/start` instead of directly initiating an interview or going to an old flow.
*   **Success Criteria:**
    *   [ ] `/start` page is created and accessible.
    *   [ ] Email input with client-side validation and error messages works.
    *   [ ] "Start Interview" button correctly calls `/api/sessions/start` and handles loading/error states.
    *   [ ] Successful submission redirects to `/interview/[sessionId]`.
    *   [ ] Landing page CTA correctly navigates to `/start`.
    *   [ ] Prefetching for the interview route is implemented.
    *   [ ] UI is responsive and meets basic styling requirements.

### Phase 3: Frontend - Interview Page Adaptations

*   **Goals:**
    *   Modify the interview page to initialize the ElevenLabs conversation only after page load.
    *   Implement logic to send the `elevenlabsConversationId` to the backend for mapping.
*   **Key Tasks:**
    1.  **Adapt `Conversation.tsx` (and/or its parent component):**
        *   Remove any automatic ElevenLabs SDK initialization/connection logic that runs purely on component mount without an explicit signal or active session.
        *   Introduce a mechanism to explicitly start the ElevenLabs session. This could be:
            *   A new function (e.g., `initiateAndStartEliSession(ourSessionId)`) called from `useEffect` on the `/interview/[sessionId]/page.tsx` once `sessionId` is available from `useParams()`.
            *   Or, pass `sessionId` as a prop and have an internal `useEffect` in `Conversation.tsx` that triggers connection only when this `sessionId` prop is valid and a connection isn't already active.
    2.  **Implement `elevenlabsConversationId` Mapping:**
        *   In `Conversation.tsx`, when the ElevenLabs session is successfully established and the ElevenLabs-generated `conversation_id` is available (e.g., from an `onConnect` callback or similar SDK event):
            *   Call a new function (passed as a prop or defined within) that makes a `POST` request to `/api/sessions/map-elevenlabs-id`.
            *   Send our internal `sessionId` (which the `/interview/[sessionId]/page.tsx` has) and the newly obtained `elevenlabsConversationId`.
            *   Handle potential errors from this API call gracefully (e.g., log them; the interview can likely proceed even if this mapping fails, but it's important for backend tracking).
    3.  **Ensure `/interview/[sessionId]/page.tsx` Orchestrates Deferred Start:**
        *   This page component will now be responsible for:
            *   Extracting `sessionId` from URL params.
            *   Once `sessionId` is available, explicitly triggering the ElevenLabs session start in `Conversation.tsx`.
            *   Passing the callback to `Conversation.tsx` that will handle sending the `elevenlabsConversationId` to the backend.
*   **Success Criteria:**
    *   [ ] ElevenLabs conversation does not start until the `/interview/[sessionId]` page loads and explicitly initiates it.
    *   [ ] The ElevenLabs-generated `conversation_id` is successfully sent to and stored by `/api/sessions/map-elevenlabs-id`.
    *   [ ] The interview functions as expected after these changes.
    *   [ ] Avatar and mic animations on `/interview/[sessionId]` still appear correctly once the session starts.

### Phase 4: Testing, Error Handling & Polish

*   **Goals:**
    *   Ensure robust error handling across the new user flow.
    *   Verify all success criteria and acceptance criteria from the PRD.
    *   Confirm performance targets.
*   **Key Tasks:**
    1.  **End-to-End Testing:**
        *   Test the full flow: Landing page -> `/start` -> email submission -> `/interview/[sessionId]` -> complete interview -> receive results email.
        *   Test with valid and invalid email formats.
        *   Test API failures for `/api/sessions/start` and `/api/sessions/map-elevenlabs-id`.
        *   Test scenarios where ElevenLabs might fail to connect.
    2.  **Error State Implementation:**
        *   Implement clear user feedback for API errors on `/start` (e.g., "Could not start session, please try again.").
        *   Graceful handling if `/api/sessions/map-elevenlabs-id` fails (log error, but don't break the interview).
    3.  **Verify Performance:**
        *   Measure start-to-interview time (`/start` submission to `/interview/[sessionId]` ready). Aim for <500ms.
    4.  **Check Acceptance Criteria:**
        *   Go through each item in the PRD's Acceptance Criteria and ensure it's met.
        *   [ ] Email is required before any interview begins.
        *   [ ] Session is created server-side after email is submitted.
        *   [ ] Interview route loads with prefetching.
        *   [ ] ElevenLabs agent does not start before navigation to interview page.
        *   [ ] Email is sent after scoring completes.
        *   [ ] UX is responsive, mobile-friendly, and intuitive.
        *   [ ] Errors are handled gracefully with clear messaging.
    5.  **Logging Review:**
        *   Ensure all new backend endpoints and critical frontend steps have adequate logging.
*   **Success Criteria:**
    *   [ ] All end-to-end tests pass.
    *   [ ] Documented error states are handled gracefully.
    *   [ ] Performance target (<500ms start-to-interview) is met.
    *   [ ] All PRD acceptance criteria are checked off.
    *   [ ] Bounce rate on `/start` is monitored post-launch (target <10%).
    *   [ ] Email capture rate is 100% for started interviews.
    *   [ ] Interview result delivery rate ≥ 95%.

---

## RISKS & MITIGATIONS

1.  **Performance Impact of `/start` page:**
    *   **Risk:** The new `/start` page and API call could introduce unacceptable latency, failing the <500ms target.
    *   **Mitigation:**
        *   Optimize the `/start` page for minimal JS bundle size.
        *   Ensure the `/api/sessions/start` endpoint is highly performant (simple DB insert).
        *   Aggressively use prefetching for the `/interview/[sessionId]` route from `/start`.
        *   If necessary, consider UI skeletons or optimistic updates on `/start` while waiting for the API.
2.  **ElevenLabs SDK Initialization Complexity:**
    *   **Risk:** Modifying `Conversation.tsx` to defer and explicitly trigger ElevenLabs SDK initialization might be more complex than anticipated or might uncover timing issues. Difficulty in obtaining `elevenlabsConversationId` reliably.
    *   **Mitigation:**
        *   Thoroughly understand the current `Conversation.tsx` initialization sequence.
        *   Prototype the deferred start and ID mapping early in Phase 3.
        *   Consult ElevenLabs SDK documentation for best practices on deferred start and accessing `conversation_id`.
        *   If direct `conversation_id` access is problematic, log all available session/call identifiers from SDK events to find a reliable one for mapping.
3.  **User Experience on `/start`:**
    *   **Risk:** Users might be confused or annoyed by the extra email step, leading to a high bounce rate.
    *   **Mitigation:**
        *   Clear, concise microcopy explaining *why* the email is needed (e.g., "Enter your email below. We'll send your full interview feedback directly to your inbox once it's ready!").
        *   Ensure the UI is clean, simple, and fast.
        *   Monitor bounce rates closely post-launch and iterate on copy/UX if needed.
4.  **Existing Session Handling:**
    *   **Risk:** If there's any existing client-side logic that assumes an interview can start without going through this new flow, it might break or lead to sessions without emails.
    *   **Mitigation:**
        *   Thoroughly audit existing interview initiation points and ensure they are all routed through the new `/start` page flow.
        *   Remove or disable any old direct-to-interview paths.
5.  **Email Validation Discrepancies:**
    *   **Risk:** Client-side and server-side email validation logic might differ, leading to confusing user experiences (email passes client-side but fails server-side).
    *   **Mitigation:**
        *   Use well-tested libraries or regex for email validation.
        *   Aim for consistency, but prioritize server-side validation as the source of truth. Client-side is for quick feedback.
        *   Ensure clear error messaging if server-side validation fails after client-side passes. 