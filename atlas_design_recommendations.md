Atlas Design Recommendation & Requirements Report – Mobile & Footer

Report created on Feb 25 2026 (America/New_York)

Context & Objectives

Atlas’s current design is minimal and aspirational but it misses important UX details on mobile devices. The existing navigation bar collapses to a hamburger icon without clear states, the mobile menu lacks feedback and keyboard focus management, and the footer is sparse and doesn’t convey trust or provide critical links. This report evaluates Atlas’s design from a Chief Product Design perspective and proposes detailed tasks, acceptance criteria and tests to bring the app up to modern UX standards. The recommendations reference best‑practice research for financial applications: simplifying complex processes into intuitive micro‑steps, offering reassuring security cues and personalised dashboards ￼ ￼.

1. Analysis of the Current Design

1.1 Desktop experience
	•	Atlas uses a dark hero section with large typography and minimal copy. This creates a calm atmosphere, which is appropriate for a financial mentor brand. The “Product” and “How it works” pages emphasise conversation‑led guidance and one actionable step at a time. The step‑by‑step description for new users is clear.
	•	Visual hierarchy: headings and numbers are large; subhead copy is small and sometimes lacks contrast against dark backgrounds. The pages rely heavily on scroll with minimal signposting.
	•	Micro‑interactions: there is little to no feedback on hover or click. Links and buttons do not animate or change colour when hovered, reducing perceived interactivity.
	•	Footer: the site appears to have either no footer or a minimal one without navigation, legal links, contact information or trust badges.

1.2 Mobile experience
	•	The navigation bar collapses to a hamburger button. Users report that the menu does not open consistently or overlay correctly on mobile screens. There is no visual feedback when tapping the button and no transitions.
	•	The mobile menu items may appear as simple links without spacing or accessible focus order.
	•	Footer: on mobile, essential links (privacy, terms of service, contact) are absent. The bottom of the screen feels unfinished and there is no call‑to‑action or reassurance when the user scrolls to the end.
	•	Responsiveness: some text may overflow or require horizontal scrolling; interactive elements like the “Try Atlas” button are not sized for thumb reach.

1.3 Accessibility & trust
	•	The dark background with light text could meet contrast requirements if carefully chosen; however, some subheadings use grey on dark grey, risking poor readability.
	•	The site lacks reassuring security cues (e.g., microcopy about encryption) which are important in fintech to inspire trust ￼.
	•	There are no visible cues about data privacy or certifications in the footer; first‑time users may not feel safe connecting their finances.
	•	There is no multi‑language support or voice‑enabled features, and no description of screen reader support; inclusive design is lacking ￼.

2. Design Goals
	1.	Fix the mobile navigation and footer: implement a responsive, accessible navigation pattern and an informative, trust‑building footer that scales gracefully across devices.
	2.	Enhance micro‑interactions across the app: add hover/click states, smooth transitions and subtle animations to guide users without overwhelming them.
	3.	Reinforce trust & clarity: introduce security microcopy and icons, ensure typographic contrast, and structure content into digestible micro‑steps ￼.
	4.	Ensure accessibility & inclusivity: meet WCAG AA guidelines for colour contrast and focus states; consider multi‑language support and screen‑reader‑friendly labels ￼.

3. Recommended Design Changes

3.1 Navigation (Hamburger & Mobile Menu)
Improvement
Rationale
Implementation Tasks
Accessible hamburger icon
Use a high‑contrast icon (e.g., white or accent colour) with an accompanying “Menu” label for clarity. Ensure it has a 44×44 px touch target and an aria-label of “Main menu” for screen readers.
1. Replace the current hamburger SVG with an accessible component. 2. Add aria-expanded attribute toggling between true/false on click. 3. Use focus-visible outline styles for keyboard navigation.
Slide‑out or full‑screen mobile menu
A slide‑out menu (drawer) provides a clear, modern way to reveal navigation on mobile. It should animate smoothly and dim the background to focus the user’s attention.
1. Implement a <Dialog> or <NavDrawer> component that animates from the right/left (depending on language direction). 2. Use CSS transitions (e.g., transform: translateX(100%) to 0) with a 300 ms ease‑in‑out curve. 3. Add an overlay that fades in (e.g., 0→60 % opacity) and closes the menu when tapped.
Organised links with clear hierarchy
Group navigation items (Product, How It Works, Library, Try Atlas) with adequate padding. Include a CTA button styled distinctly to draw attention. Use descriptive icons to accompany text if space permits.
1. Create a vertical list with 16–20 px vertical spacing and 24 px padding on each side. 2. Highlight the current page by changing its colour or adding a left border. 3. Add icons from FontAwesome to each item to aid recognition.
Close button & keyboard support
Provide a close icon (“X”) in the top right of the drawer. Ensure pressing Esc or tapping outside the drawer closes it.
1. Add a close icon with an aria-label="Close menu". 2. Handle keydown events for Esc. 3. Trap focus within the drawer while open and restore focus to the hamburger when closed.

3.2 Footer Redesign
Improvement
Rationale
Implementation Tasks
Structured layout
A footer should act as a secondary navigation and trust builder. Divide it into columns: About (mission statement), Product (key links), Resources (library, blog), Support (FAQs, contact), and Legal (Terms, Privacy).
1. Create a <footer> element with semantic <nav> and <ul> sections. 2. Use a grid or flexbox for responsive columns that stack on mobile. 3. Add the Atlas logo and tagline at the left/top of the footer.
Trust elements & certifications
Display security badges (e.g., encryption icon with microcopy like “Your data is encrypted & stored securely”), compliance statements (e.g., SOC 2 in future) and links to security/privacy policies. This builds trust .
1. Design icons representing security (lock icon) and privacy. 2. Write concise microcopy (20–30 words) emphasising encryption and confidentiality. 3. Add icons and microcopy next to the legal links.
Contact & support information
Provide a support email, social media links and a contact form link. Users who scroll to the footer expect ways to reach the company.
1. Include clickable social icons (Twitter, LinkedIn) that open in new tabs. 2. Provide a “Get support” link leading to a help centre or email prefilled with mailto:. 3. Add newsletter subscription field (optional) with minimal input fields.
Visual style & contrast
Use the same dark theme as the rest of the site, but differentiate the footer with slightly darker background and lighter text. Ensure text size is at least 14 px and meets WCAG 2.1 contrast guidelines.
1. Define a --footer-bg colour (e.g., #0B0F1E) and --footer-text colour (e.g., #A1A7C3). 2. Use headings (e.g., 16–18 px) for section titles and 14 px for links. 3. Provide hover transitions (e.g., underline or colour fade) for links.
Mobile responsiveness
On narrow screens, stack columns vertically and centre align them. Provide enough spacing (24 px top/bottom).
1. Use media queries or utility classes to switch layout at breakpoints (e.g., 640 px). 2. Ensure each group has at least 16 px separation. 3. Keep interactive elements at least 44 px high and wide for touch targets.

3.3 Global Effects, Transitions & Animations
Element
Recommendation
Implementation Tasks
Buttons & links
Add subtle hover effects (colour change or underline) and active states. Use CSS transition on background-color, color, and box-shadow (e.g., 0.3 s ease).
1. Define CSS classes for :hover and :focus states. 2. Add a slight box-shadow or colour lift on hover for primary buttons. 3. Provide depressed effect on click using CSS transform: scale(0.97).
Cards & sections
For sections describing features or steps, animate them into view when scrolled (e.g., fade up with slight slide). This adds dynamism and reinforces the step‑by‑step approach.
1. Use an intersection observer to detect when elements enter the viewport. 2. Apply a CSS class that triggers a transform: translateY(20px) -> 0 and opacity: 0 -> 1 transition over 400 ms.
Navigation transitions
When navigating between pages, fade out the old content and fade in the new to create continuity.
1. Use Next.js’s framer-motion or CSS transitions to animate route changes. 2. Keep duration under 500 ms to maintain snappy feel.
Form inputs
Provide focus states (border colour change, subtle glow) and error animations (shake or colour change) to guide users.
1. Add :focus styles with 2 px outline and colour. 2. Validate inputs on blur and show error messages with slide‑down animation.

3.4 Visual & Typographic Refinements
	•	Colour palette: refine dark palette with consistent accent colour (e.g., teal or violet) for calls‑to‑action and highlights. Ensure contrast ratio of at least 4.5:1 for text on backgrounds and 3:1 for large headings ￼.
	•	Typography: choose modern sans‑serif fonts with good readability (e.g., Inter, Work Sans). Use size hierarchy: H1 32–40 px, H2 24–28 px, body 16 px.
	•	Icons: adopt a consistent icon set (e.g., FontAwesome or HeroIcons) for navigation items, features, and footnotes.
	•	Spacing: maintain generous white space; follow an 8 px grid system to align elements and create rhythm.

4. Specific Tasks & Implementation Roadmap

The following tasks are grouped by priority. P1 tasks should be addressed immediately to fix critical UX issues (mobile menu, footer). P2 tasks focus on enhancing interactions and accessibility. P3 tasks expand into micro‑animations and long‑term improvements.

P1 – Fix Navigation & Footer
	1.	Refactor header component: build an accessible hamburger menu with slide‑out drawer as described.
	2.	Design & implement footer: craft the structured footer with essential links, trust cues, and responsive layout.
	3.	Verify responsive breakpoints: adjust layout for 320 px to 1440 px widths; ensure no horizontal scrolling or overflow.
	4.	Add security microcopy to emphasise encryption and privacy in the footer and near call‑to‑action areas.

P2 – Improve Global Interactions
	5.	Implement hover and focus states for all buttons, links and interactive components.
	6.	Add transition animations for menu open/close, card entrance and route changes.
	7.	Define accessible colour & typographic system across the app.
	8.	Add keyboard navigation support: ensure all interactive elements can be reached via Tab; maintain visible focus indicators.
	9.	Implement basic localisation structure (e.g., use i18n library) to prepare for multi‑language support.

P3 – Enhance Emotional Design & Personalisation
	10.	Create personalised dashboards for logged‑in users, using AI to surface insights and suggestions with friendly language ￼.
	11.	Integrate progressive onboarding: break down onboarding into micro‑steps with a progress indicator; allow saving and resuming for later ￼.
	12.	Add voice & conversation cues: integrate an AI chat component with natural language prompts and accessible voice commands ￼.

5. Acceptance Criteria

Each task should meet the following criteria before being considered complete:
	1.	Functionality: The mobile menu opens and closes smoothly on all modern browsers (Chrome, Safari, Firefox) on iOS and Android. The menu’s aria-expanded attribute toggles correctly; focus is trapped within the drawer when open.
	2.	Accessibility: All interactive elements meet WCAG 2.1 Level AA contrast ratios; there are visible focus indicators; the site is navigable via keyboard.
	3.	Responsiveness: Layout adapts to screen sizes from 320 px up to 1440 px without horizontal scrolling. The footer stacks gracefully on mobile.
	4.	Trust & Compliance: The footer includes links to Terms, Privacy Policy, and contact, plus a security microcopy emphasising encrypted data and user privacy ￼.
	5.	Interaction Feedback: Buttons, links, and the hamburger icon show distinct hover and active states; transitions are smooth and do not exceed 500 ms.
	6.	Performance: Animations are lightweight, avoiding jank. Lighthouse performance score remains above 90, and no layout shifts occur during interactions.
	7.	User Validation: Conduct usability testing with at least five users on mobile and desktop; gather feedback to confirm that navigation is intuitive and trust in the platform increases. Iterative adjustments are made based on feedback.

6. Enhanced Tests

6.1 Automated Tests
	•	Unit tests for header and footer components: verify that clicking the hamburger toggles the state and that aria-expanded updates. Test that closing the drawer restores focus to the hamburger.
	•	Snapshot tests for menu open/close states to ensure UI changes are intentional.
	•	Accessibility tests using tools like axe-core in Cypress to check for colour contrast and proper roles/labels.
	•	Responsive tests with Puppeteer/Cypress across breakpoints to ensure menu and footer layout adapt.
	•	Performance tests using Lighthouse CI to monitor impact of animations on performance metrics.

6.2 Manual QA Test Plan
	1.	Mobile menu interaction: On iOS Safari and Android Chrome, tap the hamburger icon. Ensure the drawer slides in within 300 ms. Try navigating via keyboard (Tab key). Press Esc to close.
	2.	Footer navigation: Scroll to the footer on multiple pages; verify presence of all sections and that links open correct pages.
	3.	Accessibility: Use screen readers (VoiceOver on iOS, TalkBack on Android) to navigate the menu and footer; ensure the labels are read correctly and there is no confusion.
	4.	Trust perception: Ask test users to rate their trust in Atlas after viewing the site. Confirm that the new footer and microcopy increase perceived security and clarity.
	5.	Visual quality: Check that hover animations trigger consistently, there is no stutter, and the colour palette appears consistent across devices.

7. Conclusion

Atlas’s mission to be a financial mentor is strong, but the current design under‑delivers, particularly on mobile. By implementing an accessible, animated mobile menu, building a structured trust‑oriented footer, improving micro‑interactions and reinforcing trust and accessibility, Atlas will feel more like the “best friend and mentor” it aspires to be. These improvements align with fintech UX best practices: intuitive journeys, reassuring security cues and personalised experiences ￼ ￼.

Following the tasks, acceptance criteria and rigorous tests laid out above will ensure the design meets high standards and delights users across devices.