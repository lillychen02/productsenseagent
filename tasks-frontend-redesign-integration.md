# Frontend Redesign Integration - Task List

## 🔧 **Phase 1: Dependencies & Setup**

### **Task 1.1: Install Required Dependencies**
- [ ] Run: `npm install @radix-ui/react-dialog @radix-ui/react-progress @radix-ui/react-tabs`
- [ ] Run: `npm install @radix-ui/react-badge @radix-ui/react-slot`
- [ ] Run: `npm install class-variance-authority clsx tailwind-merge`
- [ ] Run: `npm install lucide-react`
- [ ] Verify all packages installed without conflicts

### **Task 1.2: Copy Utility Functions**
- [ ] Copy `voice-ai-landing/lib/utils.ts` to `lib/utils.ts` 
- [ ] Ensure `cn()` utility function works correctly
- [ ] Test import: `import { cn } from "@/lib/utils"`

### **Task 1.3: Copy UI Components**
- [ ] Copy entire `voice-ai-landing/components/ui/` directory to `components/ui/`
- [ ] Verify all UI components are properly copied:
  - [ ] `components/ui/button.tsx`
  - [ ] `components/ui/card.tsx`
  - [ ] `components/ui/badge.tsx`
  - [ ] `components/ui/input.tsx`
  - [ ] `components/ui/label.tsx`
  - [ ] `components/ui/progress.tsx`
  - [ ] `components/ui/tabs.tsx`
  - [ ] All other UI components

### **Task 1.4: Update Tailwind Configuration**
- [ ] Backup current `tailwind.config.js` as `tailwind.config.backup.js`
- [ ] Copy `voice-ai-landing/tailwind.config.js` content
- [ ] Merge with existing config to preserve custom styles
- [ ] Test that existing pages still render correctly
- [ ] Verify new gradient and color schemes work

---

## 🎨 **Phase 2: Page Replacements**

### **Task 2.1: Backup Current Pages**
- [ ] Copy `app/page.tsx` to `app/page.backup.tsx`
- [ ] Copy `app/start/page.tsx` to `app/start/page.backup.tsx`

### **Task 2.2: Replace Landing Page**
- [ ] Copy `voice-ai-landing/app/page.tsx` to `app/page.tsx`
- [ ] Update import paths from `@/components/ui/*` to match project structure
- [ ] **Critical**: Update CTA links to point to `/interview-selection` (not `/start`)
- [ ] Remove any references to old `/start` routing
- [ ] Test landing page renders correctly with new design
- [ ] Verify "Get Started" buttons link to `/interview-selection`

### **Task 2.3: Create Interview Selection Page**
- [ ] Create directory: `app/interview-selection/`
- [ ] Copy `voice-ai-landing/app/interview-selection/page.tsx` to `app/interview-selection/page.tsx`
- [ ] Update import paths for UI components
- [ ] **Critical**: Update "Product Sense Interview" button to link to `/pre-interview`
- [ ] Test page renders and navigation works
- [ ] Verify routing: Landing → Interview Selection works

### **Task 2.4: Create Pre-Interview Setup Page**
- [ ] Create directory: `app/pre-interview/`
- [ ] Copy `voice-ai-landing/app/pre-interview/page.tsx` to `app/pre-interview/page.tsx`
- [ ] Update import paths for UI components
- [ ] **Critical**: Replace static form with existing `/api/sessions/start` endpoint integration
- [ ] Connect email input to session creation logic
- [ ] Update success routing to `/interview/[sessionId]` format
- [ ] Test email collection and session creation works
- [ ] Verify routing: Interview Selection → Pre-Interview works
- [ ] Test routing: Pre-Interview → Interview page after form submission

### **Task 2.5: Remove Old Start Page**
- [ ] **After** pre-interview page is working, remove `app/start/` directory
- [ ] Update any remaining references to `/start` in codebase
- [ ] Verify no broken links remain

---

## 🎤 **Phase 3: Interview Experience**

### **Task 3.1: Backup Interview Components**
- [ ] Copy `app/interview/[sessionId]/page.tsx` to `app/interview/[sessionId]/page.backup.tsx`
- [ ] Copy `app/components/conversation.tsx` to `app/components/conversation.backup.tsx`

### **Task 3.2: Update Interview Page Header**
- [ ] Update `app/interview/[sessionId]/page.tsx` header to match new design
- [ ] Change background from solid to `bg-gradient-to-br from-slate-50 to-gray-100`
- [ ] Apply new header styling from voice-ai-landing
- [ ] Preserve all existing Conversation component integration
- [ ] Preserve all existing session management logic

### **Task 3.3: Style Interview In-Progress Components**
- [ ] Update conversation container styling to match new design
- [ ] Apply new gradient backgrounds and card styling
- [ ] Update button styling to purple/pink gradients
- [ ] Preserve all ElevenLabs integration functionality
- [ ] Preserve all transcript saving logic
- [ ] Test end-to-end interview flow works

### **Task 3.4: Verify Backend Integration**
- [ ] Test session creation from new pre-interview form
- [ ] Test ElevenLabs conversation initialization
- [ ] Test transcript saving during interview
- [ ] Test session completion and routing to processing

---

## ⏳ **Phase 4: Processing Page Updates**

### **Task 4.1: Update Processing Page Styling**
- [ ] Backup `app/processing/[sessionId]/page.tsx` to `app/processing/[sessionId]/page.backup.tsx`
- [ ] Update header to match new design from voice-ai-landing
- [ ] Change background from `bg-gray-50` to `bg-gradient-to-br from-slate-50 to-gray-100`
- [ ] Update card styling to match new design system
- [ ] Update colors from indigo to purple/pink gradient scheme
- [ ] Update typography and spacing to match new design

### **Task 4.2: Preserve All Processing Logic**
- [ ] **DO NOT CHANGE**: Status polling logic (every 5 seconds)
- [ ] **DO NOT CHANGE**: Friendly status messages function
- [ ] **DO NOT CHANGE**: Error handling and max attempt limits
- [ ] **DO NOT CHANGE**: Automatic redirect logic
- [ ] **DO NOT CHANGE**: API integration with `/api/session-status/[sessionId]`
- [ ] Test that all processing functionality still works

### **Task 4.3: Test Processing Flow**
- [ ] Complete an interview and verify processing page appears
- [ ] Verify status polling works correctly
- [ ] Verify automatic redirect to results when scoring complete
- [ ] Test error handling scenarios

---

## 📊 **Phase 5: Results Page Updates**

### **Task 5.1: Update Results Page Header Only**
- [ ] Backup `app/results/[sessionId]/page.tsx` to `app/results/[sessionId]/page.backup.tsx`
- [ ] Update header component to match new design from voice-ai-landing
- [ ] Update any footer background colors to match new design
- [ ] **DO NOT CHANGE**: Any scoring display logic
- [ ] **DO NOT CHANGE**: Transcript modal functionality
- [ ] **DO NOT CHANGE**: Ask Loopie sidebar
- [ ] **DO NOT CHANGE**: Download/sharing features
- [ ] **DO NOT CHANGE**: Backend data fetching

### **Task 5.2: Test Results Page**
- [ ] Complete full interview flow to reach results
- [ ] Verify all scoring data displays correctly
- [ ] Test transcript modal opens and works
- [ ] Test Ask Loopie sidebar functionality
- [ ] Verify all existing features preserved

---

## 🔌 **Phase 6: Backend Integration Verification**

### **Task 6.1: Test All API Endpoints**
- [ ] Test `/api/sessions/start` still works with new pre-interview form
- [ ] Test `/api/sessions/map-elevenlabs-id` works with new interview flow
- [ ] Test `/api/elevenlabs-webhook` receives and processes webhooks correctly
- [ ] Test `/api/session-status/[sessionId]` returns correct status
- [ ] Test `/api/results/[sessionId]` returns scoring data correctly

### **Task 6.2: Test Complete New User Flow**
- [ ] Start from landing page (/) 
- [ ] Navigate to interview selection (/interview-selection)
- [ ] Navigate to pre-interview setup (/pre-interview)
- [ ] Complete email collection and session creation
- [ ] Start and complete interview (/interview/[sessionId])
- [ ] Verify processing page shows and polls correctly (/processing/[sessionId])
- [ ] Verify results page loads with all data (/results/[sessionId])
- [ ] Test ngrok webhook delivery works

### **Task 6.3: Verify Session Management**
- [ ] Test session metadata creation in MongoDB
- [ ] Test ElevenLabs conversation ID mapping
- [ ] Test transcript saving with correct session IDs
- [ ] Test scoring job creation and processing

---

## 🧪 **Phase 7: Testing & Validation**

### **Task 7.1: End-to-End Testing**
- [ ] Test complete flow: Landing → Selection → Pre-interview → Interview → Processing → Results
- [ ] Test with real ElevenLabs integration
- [ ] Test webhook processing with ngrok
- [ ] Test email sending functionality
- [ ] Test error scenarios and fallbacks

### **Task 7.2: Cross-Browser Testing**
- [ ] Test on Chrome
- [ ] Test on Safari
- [ ] Test on Firefox
- [ ] Test mobile responsiveness

### **Task 7.3: Performance Testing**
- [ ] Verify page load times acceptable
- [ ] Test with slow network connections
- [ ] Verify voice functionality performance unchanged

### **Task 7.4: Routing & Navigation Testing**
- [ ] Test all navigation flows work correctly
- [ ] Test back button functionality
- [ ] Test direct URL access to each page
- [ ] Verify no broken links exist

---

## 📦 **Phase 8: Deployment Preparation**

### **Task 8.1: Code Review**
- [ ] Review all changed files for code quality
- [ ] Ensure no console.logs or debug code left
- [ ] Verify all TypeScript types are correct
- [ ] Check for unused imports

### **Task 8.2: Documentation**
- [ ] Update README with new user flow
- [ ] Document any new environment variables
- [ ] Update deployment notes

### **Task 8.3: Pre-Deployment Checklist**
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] All features working in local environment
- [ ] Backup plan ready (can revert to .backup.tsx files)

---

## 🚨 **Rollback Tasks (If Needed)**

### **Emergency Rollback**
- [ ] Restore `app/page.tsx` from `app/page.backup.tsx`
- [ ] Restore `app/interview/[sessionId]/page.tsx` from backup
- [ ] Restore `app/processing/[sessionId]/page.tsx` from backup
- [ ] Restore `app/results/[sessionId]/page.tsx` from backup
- [ ] Restore `tailwind.config.js` from `tailwind.config.backup.js`
- [ ] Remove new directories: `app/interview-selection/`, `app/pre-interview/`
- [ ] Restore `app/start/` directory from backup
- [ ] Verify original functionality restored

---

## ✅ **Completion Checklist**

- [ ] All phases completed successfully
- [ ] Full user flow tested end-to-end
- [ ] New routing flow works: / → /interview-selection → /pre-interview → /interview/[sessionId] → /processing/[sessionId] → /results/[sessionId]
- [ ] All backend functionality preserved
- [ ] New design implemented consistently
- [ ] Performance maintained or improved
- [ ] Documentation updated
- [ ] Ready for production deployment 