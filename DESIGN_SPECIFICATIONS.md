# Atlas Mobile & Interactive Design Specifications
## Chief Product Designer Requirements Document

---

## 1. HAMBURGER BUTTON & MOBILE MENU DESIGN

### 1.1 Hamburger Button Specifications

**Visual Design:**
- **Shape**: Pill-shaped with rounded corners (border-radius: 24px)
- **Size**: 44px × 44px minimum (touch target)
- **Background**: Teal-600 (#14b8a6) in light mode, teal-700 (#0d9488) in dark mode
- **Icon**: Menu/X icon from lucide-react (size: 20px)
- **Icon Color**: White (#ffffff)
- **Padding**: 12px horizontal, 10px vertical
- **Border**: None
- **Position**: Top-right corner of navbar on mobile (<768px)
- **Z-index**: 50

**Hover State:**
- **Background Color**: Teal-700 (#0d9488)
- **Transition**: 200ms ease-in-out
- **Effect**: Subtle scale transform (scale: 1.05)
- **Cursor**: pointer
- **Shadow**: None on hover (keep minimal)

**Active/Clicked State:**
- **Background Color**: Teal-800 (#115e59)
- **Transform**: scale(0.98) - slight press-down effect
- **Transition**: 100ms ease-out
- **Icon**: Rotates to X icon with smooth 180° rotation

**Accessibility:**
- **aria-label**: "Toggle navigation menu"
- **aria-expanded**: true/false based on menu state
- **Keyboard**: Fully keyboard accessible (Tab, Enter, Escape)
- **Focus State**: 2px outline in teal-600 with 2px offset

### 1.2 Mobile Menu (Slide-out Drawer)

**Visual Design:**
- **Position**: Fixed, right side of screen
- **Width**: 280px on mobile, 320px on tablet
- **Height**: 100vh (full viewport height)
- **Background**: White (#ffffff) in light mode, slate-950 (#030712) in dark mode
- **Border**: Left border 1px solid slate-200 (light) / slate-800 (dark)
- **Shadow**: -4px 0 12px rgba(0, 0, 0, 0.15)
- **Z-index**: 50 (drawer), 40 (overlay)
- **Padding**: 24px top, 20px horizontal, 20px bottom

**Overlay (Backdrop):**
- **Background**: rgba(0, 0, 0, 0.5)
- **Position**: Fixed, full screen
- **Transition**: 200ms opacity ease-in-out
- **Click to Close**: Yes, clicking overlay closes menu

**Animation - Open:**
- **Type**: Slide-in from right
- **Duration**: 300ms
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1) - Material Design standard
- **Transform**: translateX(0) from translateX(100%)
- **Overlay Fade**: opacity 0 to 1 in 300ms

**Animation - Close:**
- **Type**: Slide-out to right
- **Duration**: 250ms
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1)
- **Transform**: translateX(100%)
- **Overlay Fade**: opacity 1 to 0 in 250ms

**Close Button:**
- **Position**: Top-right corner (24px from top, 20px from right)
- **Style**: Pill-shaped, teal-600 background
- **Size**: 40px × 40px
- **Icon**: X icon (size: 20px)
- **Hover**: Same as hamburger button

**Menu Items:**
- **Layout**: Vertical stack, full width
- **Spacing**: 12px between items
- **Font Size**: 16px
- **Font Weight**: 500
- **Color**: slate-900 (light) / white (dark)
- **Padding**: 12px horizontal, 10px vertical per item
- **Border Radius**: 8px

**Menu Item Hover State:**
- **Background**: slate-100 (light) / slate-800 (dark)
- **Color**: slate-900 (light) / white (dark)
- **Transition**: 150ms ease-in-out
- **Transform**: translateX(4px) - subtle slide right
- **Cursor**: pointer

**Menu Item Active State:**
- **Background**: teal-100 (light) / teal-900/30 (dark)
- **Color**: teal-700 (light) / teal-400 (dark)
- **Border-left**: 3px solid teal-600
- **Padding-left**: 9px (account for border)

**CTA Button in Menu:**
- **Style**: Full width, pill-shaped
- **Background**: teal-600
- **Color**: white
- **Padding**: 12px
- **Margin-top**: 16px
- **Font Weight**: 600
- **Hover**: bg-teal-700, scale(1.02)
- **Active**: bg-teal-800, scale(0.98)

---

## 2. FOOTER DESIGN SPECIFICATIONS

### 2.1 Footer Container

**Visual Design:**
- **Background**: White (#ffffff) in light mode, slate-950 (#030712) in dark mode
- **Border-top**: 1px solid slate-200 (light) / slate-800 (dark)
- **Padding**: 64px horizontal, 48px vertical
- **Margin-top**: 80px
- **Max-width**: 100% (full width)

### 2.2 Brand Section

**Logo & Text:**
- **Layout**: Flex, gap 12px
- **Logo Size**: 28px
- **Logo Hover**: opacity 0.7, transition 200ms
- **Text Font Size**: 20px
- **Text Font Weight**: 700
- **Text Color**: slate-900 (light) / white (dark)
- **Tagline Font Size**: 14px
- **Tagline Color**: slate-600 (light) / slate-400 (dark)
- **Tagline Max-width**: 320px
- **Tagline Line-height**: 1.6

**Get Started Button:**
- **Style**: Pill-shaped (border-radius: 24px)
- **Background**: teal-600
- **Color**: white
- **Padding**: 12px 24px
- **Font Size**: 14px
- **Font Weight**: 600
- **Margin-top**: 16px
- **Width**: 100% (on mobile), auto (on desktop)

**Button Hover State:**
- **Background**: teal-700
- **Transition**: 200ms ease-in-out
- **Transform**: scale(1.02)
- **Shadow**: 0 4px 12px rgba(20, 184, 166, 0.3)

**Button Active State:**
- **Background**: teal-800
- **Transform**: scale(0.98)
- **Transition**: 100ms ease-out

### 2.3 Footer Sections Grid

**Grid Layout:**
- **Mobile**: 1 column, full width
- **Tablet (640px+)**: 2 columns, equal width
- **Desktop (1024px+)**: 4 columns (Product, Company, Legal, Resources)
- **Gap**: 32px horizontal, 24px vertical
- **Margin-top**: 32px (after brand section divider)

**Section Headers:**
- **Font Size**: 12px
- **Font Weight**: 700
- **Text Transform**: uppercase
- **Letter Spacing**: 0.1em
- **Color**: slate-900 (light) / white (dark)
- **Margin-bottom**: 16px
- **Opacity**: 0.8

**Section Links:**
- **Font Size**: 14px
- **Font Weight**: 500
- **Color**: slate-600 (light) / slate-400 (dark)
- **Spacing**: 12px between items
- **Bullet Point**: "•" character before label
- **Margin-left**: 8px (after bullet)

**Link Hover State:**
- **Color**: slate-900 (light) / white (dark)
- **Transition**: 150ms ease-in-out
- **Transform**: translateX(2px)
- **Cursor**: pointer

**Link Active State:**
- **Color**: teal-600 (light) / teal-400 (dark)
- **Font Weight**: 600

### 2.4 Footer Bottom Section

**Layout:**
- **Border-top**: 1px solid slate-200 (light) / slate-800 (dark)
- **Padding-top**: 24px
- **Margin-top**: 32px
- **Display**: Flex, justify-between, flex-wrap
- **Gap**: 16px

**Copyright Text:**
- **Font Size**: 12px
- **Color**: slate-600 (light) / slate-400 (dark)
- **Font Weight**: 500

**Disclaimer Text:**
- **Font Size**: 11px
- **Color**: slate-500 (light) / slate-500 (dark)
- **Max-width**: 400px
- **Line-height**: 1.5

---

## 3. GLOBAL BUTTON INTERACTION SPECIFICATIONS

### 3.1 Primary Button (CTA Buttons)

**Default State:**
- **Background**: teal-600
- **Color**: white
- **Border**: none
- **Border-radius**: 24px (pill-shaped)
- **Padding**: 12px 24px
- **Font Weight**: 600
- **Font Size**: 14px
- **Cursor**: pointer
- **Transition**: all 200ms ease-in-out

**Hover State:**
- **Background**: teal-700
- **Transform**: translateY(-2px)
- **Box-shadow**: 0 4px 12px rgba(20, 184, 166, 0.3)
- **Transition**: 200ms ease-in-out

**Active/Click State:**
- **Background**: teal-800
- **Transform**: translateY(0px) scale(0.98)
- **Box-shadow**: 0 2px 4px rgba(20, 184, 166, 0.2)
- **Transition**: 100ms ease-out

**Focus State (Keyboard):**
- **Outline**: 2px solid teal-600
- **Outline-offset**: 2px

**Disabled State:**
- **Background**: slate-300 (light) / slate-700 (dark)
- **Color**: slate-500
- **Cursor**: not-allowed
- **Opacity**: 0.6

### 3.2 Secondary Button (Outlined)

**Default State:**
- **Background**: transparent
- **Border**: 2px solid slate-300 (light) / slate-600 (dark)
- **Color**: slate-900 (light) / white (dark)
- **Border-radius**: 24px
- **Padding**: 10px 22px (account for border)
- **Font Weight**: 600
- **Font Size**: 14px
- **Cursor**: pointer
- **Transition**: all 200ms ease-in-out

**Hover State:**
- **Background**: slate-100 (light) / slate-800 (dark)
- **Border-color**: slate-400 (light) / slate-500 (dark)
- **Transform**: translateY(-2px)
- **Box-shadow**: 0 4px 12px rgba(0, 0, 0, 0.1)

**Active/Click State:**
- **Background**: slate-200 (light) / slate-700 (dark)
- **Transform**: translateY(0px) scale(0.98)
- **Box-shadow**: 0 2px 4px rgba(0, 0, 0, 0.05)

### 3.3 Text Link Button

**Default State:**
- **Background**: transparent
- **Border**: none
- **Color**: slate-600 (light) / slate-400 (dark)
- **Text-decoration**: none
- **Font Weight**: 500
- **Cursor**: pointer
- **Transition**: color 150ms ease-in-out

**Hover State:**
- **Color**: slate-900 (light) / white (dark)
- **Text-decoration**: underline
- **Transform**: translateX(2px)

**Active State:**
- **Color**: teal-600 (light) / teal-400 (dark)

---

## 4. ACCEPTANCE CRITERIA & TESTING REQUIREMENTS

### 4.1 Mobile Menu Acceptance Criteria

**Functionality:**
- [ ] Hamburger button appears only on screens <768px width
- [ ] Hamburger button is hidden on desktop (≥768px)
- [ ] Menu opens with smooth slide-in animation (300ms)
- [ ] Menu closes with smooth slide-out animation (250ms)
- [ ] Overlay appears when menu is open
- [ ] Clicking overlay closes the menu
- [ ] Clicking menu items closes the menu
- [ ] Pressing Escape key closes the menu
- [ ] Menu items navigate to correct pages
- [ ] Start button in menu navigates to /conversation
- [ ] Close button (X) closes the menu

**Visual Design:**
- [ ] Hamburger button is pill-shaped with teal background
- [ ] Menu drawer slides from right side
- [ ] Menu has proper padding and spacing
- [ ] Menu items have proper hover states
- [ ] Menu items have proper active states
- [ ] Close button is positioned correctly
- [ ] Overlay has correct opacity and color
- [ ] Menu width is correct (280px mobile, 320px tablet)

**Animation & Transitions:**
- [ ] Open animation uses cubic-bezier(0.4, 0, 0.2, 1) easing
- [ ] Close animation uses cubic-bezier(0.4, 0, 0.2, 1) easing
- [ ] Overlay fades in/out smoothly
- [ ] Menu items have hover transform (translateX 4px)
- [ ] No jank or stuttering during animations
- [ ] Animations are smooth at 60fps

**Accessibility:**
- [ ] Hamburger button has aria-label
- [ ] Hamburger button has aria-expanded attribute
- [ ] Menu items are keyboard navigable
- [ ] Focus states are visible
- [ ] Escape key closes menu
- [ ] Tab order is logical
- [ ] Screen reader announces menu state

**Responsive:**
- [ ] Menu works on iPhone SE (375px)
- [ ] Menu works on iPhone 12 (390px)
- [ ] Menu works on iPad (768px - should not show)
- [ ] Menu works on iPad Pro (1024px - should not show)
- [ ] Hamburger button is touch-friendly (44px minimum)

### 4.2 Footer Acceptance Criteria

**Layout & Structure:**
- [ ] Footer has proper spacing (64px horizontal, 48px vertical)
- [ ] Brand section displays logo, text, and button
- [ ] 4-section grid displays correctly on desktop
- [ ] 2-column layout on tablet
- [ ] 1-column layout on mobile
- [ ] All sections are properly aligned
- [ ] Dividers are present and styled correctly

**Visual Design:**
- [ ] Footer background is correct color
- [ ] Text colors have proper contrast
- [ ] Section headers are uppercase
- [ ] Links have bullet points
- [ ] Get Started button is pill-shaped
- [ ] Copyright text is present
- [ ] Disclaimer text is present
- [ ] Dark mode styling is correct

**Button Interactions:**
- [ ] Get Started button has hover state
- [ ] Get Started button has active state
- [ ] Get Started button has proper padding
- [ ] Links have hover states
- [ ] Links have active states
- [ ] All buttons are clickable

**Responsive:**
- [ ] Footer is responsive on all screen sizes
- [ ] Text is readable on mobile
- [ ] Buttons are touch-friendly
- [ ] Spacing is appropriate on all sizes
- [ ] No horizontal scrolling

**Accessibility:**
- [ ] All links are keyboard accessible
- [ ] Focus states are visible
- [ ] Color contrast meets WCAG AA
- [ ] Links have descriptive text
- [ ] Footer is properly marked with <footer> tag

### 4.3 Button Interaction Acceptance Criteria

**Primary Button (CTA):**
- [ ] Hover state shows teal-700 background
- [ ] Hover state has translateY(-2px) transform
- [ ] Hover state has shadow effect
- [ ] Click state shows teal-800 background
- [ ] Click state has scale(0.98) transform
- [ ] Focus state has visible outline
- [ ] Disabled state is visually distinct
- [ ] Transitions are smooth (200ms)

**Secondary Button:**
- [ ] Hover state shows background color
- [ ] Hover state has border color change
- [ ] Hover state has shadow effect
- [ ] Click state has proper styling
- [ ] Focus state has visible outline
- [ ] Transitions are smooth (200ms)

**Text Link:**
- [ ] Hover state changes color
- [ ] Hover state adds underline
- [ ] Hover state has translateX(2px) transform
- [ ] Active state shows teal color
- [ ] Focus state has visible outline

**All Buttons:**
- [ ] Cursor changes to pointer on hover
- [ ] No flickering during transitions
- [ ] Animations are smooth at 60fps
- [ ] Touch targets are minimum 44px
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Disabled states are clear

---

## 5. TESTING CHECKLIST

### 5.1 Visual Testing

**Desktop (1920x1080):**
- [ ] Hamburger button is hidden
- [ ] Desktop navigation is visible
- [ ] Footer displays 4-column grid
- [ ] All buttons have proper styling
- [ ] Hover states work correctly
- [ ] Dark mode displays correctly

**Tablet (768x1024):**
- [ ] Hamburger button is hidden
- [ ] Footer displays 2-column grid
- [ ] All elements are properly sized
- [ ] Touch targets are adequate

**Mobile (375x667):**
- [ ] Hamburger button is visible
- [ ] Hamburger button is properly styled
- [ ] Menu opens and closes smoothly
- [ ] Menu items are readable
- [ ] Footer displays 1-column layout
- [ ] All text is readable
- [ ] No horizontal scrolling

### 5.2 Interaction Testing

**Hamburger Button:**
- [ ] Click opens menu
- [ ] Click again closes menu
- [ ] Hover shows proper state
- [ ] Active state shows proper styling
- [ ] Icon rotates to X when open

**Mobile Menu:**
- [ ] Slides in from right
- [ ] Overlay appears
- [ ] Clicking overlay closes menu
- [ ] Clicking menu item closes menu
- [ ] Escape key closes menu
- [ ] Menu items navigate correctly
- [ ] Start button navigates to /conversation

**Footer Buttons:**
- [ ] Get Started button is clickable
- [ ] Get Started button navigates correctly
- [ ] Footer links are clickable
- [ ] Footer links navigate correctly
- [ ] All buttons have hover states
- [ ] All buttons have active states

### 5.3 Animation Testing

**Menu Open:**
- [ ] Smooth slide-in animation
- [ ] Overlay fades in
- [ ] Duration is 300ms
- [ ] No jank or stuttering
- [ ] Easing is correct

**Menu Close:**
- [ ] Smooth slide-out animation
- [ ] Overlay fades out
- [ ] Duration is 250ms
- [ ] No jank or stuttering

**Button Hover:**
- [ ] Smooth color transition
- [ ] Smooth transform transition
- [ ] Shadow appears smoothly
- [ ] Duration is 200ms

**Button Click:**
- [ ] Smooth scale transition
- [ ] Duration is 100ms
- [ ] Feels responsive

### 5.4 Accessibility Testing

**Keyboard Navigation:**
- [ ] Tab navigates through all interactive elements
- [ ] Shift+Tab navigates backwards
- [ ] Enter activates buttons
- [ ] Escape closes menu
- [ ] Focus order is logical

**Screen Reader:**
- [ ] Hamburger button is announced
- [ ] Menu state is announced
- [ ] Menu items are announced
- [ ] Buttons are announced
- [ ] Links are announced
- [ ] Footer is announced

**Color Contrast:**
- [ ] Text meets WCAG AA (4.5:1 for normal text)
- [ ] Buttons meet WCAG AA
- [ ] Links meet WCAG AA
- [ ] Focus states are visible

**Focus States:**
- [ ] All interactive elements have visible focus
- [ ] Focus outline is 2px
- [ ] Focus outline is high contrast
- [ ] Focus outline has 2px offset

### 5.5 Performance Testing

**Animation Performance:**
- [ ] Animations run at 60fps
- [ ] No frame drops during menu open/close
- [ ] No frame drops during button hover
- [ ] No jank or stuttering
- [ ] Smooth on low-end devices

**Load Performance:**
- [ ] Menu opens instantly
- [ ] No delay in animations
- [ ] No layout shift when menu opens
- [ ] Footer loads quickly

### 5.6 Browser Testing

**Desktop Browsers:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Mobile Browsers:**
- [ ] Chrome Mobile (latest)
- [ ] Safari iOS (latest)
- [ ] Firefox Mobile (latest)
- [ ] Samsung Internet (latest)

**Devices:**
- [ ] iPhone SE (375px)
- [ ] iPhone 12 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] Samsung Galaxy S21 (360px)
- [ ] iPad (768px)
- [ ] iPad Pro (1024px)

---

## 6. IMPLEMENTATION PRIORITIES

### Phase 1 (Critical)
1. Hamburger button styling and visibility
2. Mobile menu slide-in/slide-out animations
3. Menu item interactions
4. Footer responsive layout
5. Button hover states

### Phase 2 (High)
1. Advanced animations and easing
2. Accessibility features
3. Dark mode styling
4. Focus states
5. Disabled states

### Phase 3 (Standard)
1. Performance optimization
2. Browser compatibility
3. Device testing
4. Edge case handling
5. Documentation

---

## 7. DESIGN TOKENS

**Colors:**
- Primary: teal-600 (#14b8a6)
- Primary Hover: teal-700 (#0d9488)
- Primary Active: teal-800 (#115e59)
- Text Primary: slate-900 (#0f172a) / white (#ffffff)
- Text Secondary: slate-600 (#475569) / slate-400 (#94a3b8)
- Border: slate-200 (#e2e8f0) / slate-800 (#1e293b)
- Background: white (#ffffff) / slate-950 (#030712)

**Spacing:**
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- 2xl: 32px
- 3xl: 48px
- 4xl: 64px

**Border Radius:**
- sm: 4px
- md: 8px
- lg: 12px
- full: 24px (pill-shaped)

**Transitions:**
- Fast: 100ms
- Normal: 150ms
- Slow: 200ms
- Slower: 300ms

**Easing:**
- Standard: cubic-bezier(0.4, 0, 0.2, 1)
- Ease-in: cubic-bezier(0.4, 0, 1, 1)
- Ease-out: cubic-bezier(0, 0, 0.2, 1)

---

## 8. SIGN-OFF

**Design Lead**: [Awaiting Approval]
**Product Manager**: [Awaiting Approval]
**Engineering Lead**: [Awaiting Approval]
**QA Lead**: [Awaiting Approval]

---

*Document Version: 1.0*
*Last Updated: February 25, 2026*
*Status: Ready for Implementation*
