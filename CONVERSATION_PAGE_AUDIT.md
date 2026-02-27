# Conversation Page Design Audit

## Critical Issues to Investigate

### 1. Message Bubbles
- [ ] User message styling (right-aligned, background color)
- [ ] Assistant message styling (left-aligned, background color)
- [ ] Message text color and readability
- [ ] Message spacing and padding

### 2. Input Area
- [ ] Textarea styling (border, background, focus state)
- [ ] Send button styling and placement
- [ ] Mic button styling and placement
- [ ] Input area background and border

### 3. Header/TopBar
- [ ] Background color and transparency
- [ ] Title styling
- [ ] Status pill styling
- [ ] Theme toggle button styling

### 4. Overall Layout
- [ ] Page background color
- [ ] Scroll behavior
- [ ] Mobile vs desktop layout
- [ ] Tab bar styling (if mobile)

### 5. Buttons and Interactive Elements
- [ ] Primary button styling
- [ ] Secondary button styling
- [ ] Icon button styling
- [ ] Hover/active states

### 6. Typography
- [ ] Font sizes
- [ ] Font weights
- [ ] Line heights
- [ ] Color contrast

## Components Used on Conversation Page
1. ConversationScreen (src/screens/Conversation.tsx)
2. TopBar (src/components/TopBar.tsx)
3. Button (src/components/Buttons.tsx)
4. IconButton (src/components/IconButton.tsx)
5. Textarea (src/components/TextInput.tsx)
6. Card (src/components/Card.tsx)
7. PageContainer (src/components/Layout.tsx)

## Design System Reference
- Colors: --bg, --card, --bdr, --ink, --ink2, --ink3, --teal, --sky, etc.
- Spacing: --space-1 through --space-8, --padX, --padY
- Shadows: --sh1, --sh2, --sh3
- Border radius: --r-sm, --r-md, --r-lg
- Typography: --fsHero, --fsTitle, --fsH2, --fsBody

## Status
- [ ] All components verified to use CSS variables
- [ ] No Tailwind classes found in components
- [ ] All styling aligned with design system
- [ ] Deployed version matches local code
