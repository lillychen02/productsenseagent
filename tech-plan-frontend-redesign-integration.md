# Technical Plan: Frontend Redesign Integration

## 🎯 **Overview**
Integration plan for the new front-end design (`voice-ai-landing`) with existing backend functionality. The approach preserves all backend interview voice functionality and results processing while updating the user flow and visual design.

## 📋 **Integration Strategy**

### **Full Replacement Pages:**
- Landing page (`/`)
- Interview selection (`/interview-selection`) 
- Pre-interview setup (`/pre-interview`)
- Interview in-progress (`/interview/in-progress`)

### **Styling Updates Only:**
- **Processing page** (`/processing/[sessionId]`) - Keep logic, update header/footer/styling
- **Results page** (`/results/[sessionId]`) - Keep functionality, update header/footer only

---

## 🔧 **Phase 1: Dependencies & Setup**

### **1.1 Install New UI Dependencies**
```bash
npm install @radix-ui/react-dialog @radix-ui/react-progress @radix-ui/react-tabs
npm install @radix-ui/react-badge @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
```

### **1.2 Update Tailwind Configuration**
- Copy `tailwind.config.js` from voice-ai-landing
- Merge with existing config to preserve custom styles
- Add new color schemes and animations

### **1.3 Copy UI Components**
- Copy entire `components/ui/` directory from voice-ai-landing
- Copy `lib/utils.ts` for cn() utility function

---

## 🎨 **Phase 2: Page Replacements**

### **2.1 Landing Page (`app/page.tsx`)**
- **Action**: Full replacement
- **Source**: `voice-ai-landing/app/page.tsx`
- **Updates needed**: 
  - Update CTA links to point to `/interview-selection` (new interview selection page)
  - Remove any references to `/start` (that page will be replaced)

### **2.2 Interview Selection (`app/interview-selection/page.tsx`)**
- **Action**: Create new page
- **Source**: `voice-ai-landing/app/interview-selection/page.tsx`
- **Routing**: Create new interview selection flow
- **Integration**: Update "Product Sense Interview" button to link to `/pre-interview`

### **2.3 Pre-Interview Setup**
- **Current**: `/start` page with email collection
- **New approach**: **Replace** `/start` with new `/pre-interview` page
- **Source**: `voice-ai-landing/app/pre-interview/page.tsx`
- **Backend integration**: 
  - Connect form to existing `/api/sessions/start` endpoint
  - Maintain existing session creation logic
  - Update routing to existing `/interview/[sessionId]` after session creation
- **Migration**: Remove old `/start` page after successful replacement

---

## 🎤 **Phase 3: Interview Experience**

### **3.1 Interview In-Progress Page**
- **Action**: Significant update to existing `/interview/[sessionId]/page.tsx`
- **New design**: Use `voice-ai-landing/app/interview/in-progress/page.tsx` styling
- **Backend preservation**:
  - Keep all existing ElevenLabs integration
  - Maintain Conversation component logic
  - Preserve session mapping and transcript saving
  - Keep existing error handling and routing

### **3.2 Integration Approach**:
```typescript
// Updated interview page structure:
// 1. New header design (from voice-ai-landing)
// 2. New visual styling (gradients, cards)
// 3. Preserve existing Conversation component functionality
// 4. Keep existing routing to /processing after interview ends
```

---

## ⏳ **Phase 4: Processing Page (Styling Updates Only)**

### **4.1 Current Functionality to Preserve**:
- ✅ Status polling every 5 seconds
- ✅ Friendly status messages
- ✅ Error handling and max attempt limits
- ✅ Automatic redirect to results when complete
- ✅ All backend integration

### **4.2 Visual Updates Only**:
- **Header**: Apply new header design from voice-ai-landing
- **Background**: Change from `bg-gray-50` to `bg-gradient-to-br from-slate-50 to-gray-100`
- **Cards**: Update styling to match new design system
- **Colors**: Update from indigo to purple/pink gradient scheme
- **Typography**: Apply new font weights and spacing

### **4.3 Updated Processing Page Design**:
```typescript
// Keep existing logic, update only:
// - Header component (new design)
// - Background gradients
// - Card styling
// - Button styling (purple gradient instead of indigo)
// - Preserve all polling and error handling logic
```

---

## 📊 **Phase 5: Results Page (Minimal Updates)**

### **5.1 Keep Existing Functionality**:
- ✅ All scoring display logic
- ✅ Transcript modal functionality  
- ✅ Ask Loopie sidebar
- ✅ Download and sharing features
- ✅ All backend data fetching

### **5.2 Updates Only**:
- **Header**: Replace with new header design from voice-ai-landing
- **Footer**: Update background color and styling to match new design
- **No other changes**: Preserve all complex functionality

---

## 🔌 **Phase 6: Backend Integration Points**

### **6.1 API Endpoints (No Changes)**:
- ✅ `/api/sessions/start` - Keep existing
- ✅ `/api/sessions/map-elevenlabs-id` - Keep existing  
- ✅ `/api/elevenlabs-webhook` - Keep existing
- ✅ `/api/session-status/[sessionId]` - Keep existing
- ✅ `/api/results/[sessionId]` - Keep existing

### **6.2 Routing Updates**:
```typescript
// New flow:
/ (landing) → /interview-selection → /pre-interview → /interview/[sessionId] → /processing/[sessionId] → /results/[sessionId]

// vs Current flow:
/ (landing) → /start → /interview/[sessionId] → /processing/[sessionId] → /results/[sessionId]
```

### **6.3 Session Management**:
- Ensure email collection in new pre-interview page connects to existing session creation
- Preserve all existing session metadata handling
- Maintain ElevenLabs conversation ID mapping

---

## 🧪 **Phase 7: Testing Strategy**

### **7.1 Critical Path Testing**:
1. **Email Collection**: New pre-interview form → session creation
2. **Interview Flow**: Session start → ElevenLabs integration → transcript saving
3. **Processing**: Status polling → scoring completion → redirect
4. **Results**: Score display → Ask Loopie → email functionality

### **7.2 Backend Integration Testing**:
- Test webhook handling with ngrok
- Verify transcript saving with new session IDs
- Confirm scoring job processing
- Validate email sending functionality

---

## 📦 **Phase 8: Migration Plan**

### **8.1 Implementation Order**:
1. **Setup** (Phase 1): Dependencies and UI components
2. **Static Pages** (Phase 2): Landing, selection, pre-interview  
3. **Interview Pages** (Phase 3): In-progress interview experience
4. **Processing** (Phase 4): Update styling only
5. **Results** (Phase 5): Header/footer updates only
6. **Testing** (Phase 7): End-to-end validation

### **8.2 Rollback Plan**:
- Keep current pages as `.backup.tsx` during migration
- Test each phase independently before proceeding
- Maintain existing API contracts throughout

---

## ⚠️ **Critical Considerations**

### **8.1 Preserve These Exactly**:
- ElevenLabs integration and voice functionality
- Session creation and management logic
- Transcript saving and retrieval
- Scoring job processing and webhook handling
- Email sending functionality
- All error handling and edge cases

### **8.2 Update These Only**:
- Visual design and styling
- User flow and navigation
- Page layouts and components
- Color schemes and typography

---

## 🎯 **Success Criteria**

- ✅ New visual design implemented
- ✅ All existing backend functionality preserved
- ✅ No breaking changes to API contracts
- ✅ End-to-end interview flow works perfectly
- ✅ Processing and results pages maintain full functionality
- ✅ Email collection and session management unchanged
- ✅ Performance and error handling preserved

---

## 📋 **Next Steps**

1. **Review and approve** this technical plan
2. **Begin Phase 1**: Install dependencies and setup UI components
3. **Implement incrementally** following the phase order
4. **Test each phase** before proceeding to the next
5. **Deploy with confidence** knowing backend functionality is preserved
</rewritten_file> 