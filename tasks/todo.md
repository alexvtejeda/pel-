# Slack-like Layered Chat UI Redesign

**Goal:** Transform the RC dashboard chat tab into a Slack-like split layout with visual depth layers, and apply the layered aesthetic to the overall dashboard shell.

**Reference:** `slack-ref.png` — 3-layer depth: sidebar (deepest) → conversation list (middle) → chat content (top/brightest)

**Behavior:**
- Sidebar **expanded** → conversation list shows compact: avatar + last message only
- Sidebar **collapsed** → conversation list shows full: avatar + name + last message
- Chat content area feels elevated (brightest, `rounded-tl-2xl`, on top of everything)
- Layered depth applied to all dashboard tabs (not just chat)

---

## Tasks

- [x] **1. Dashboard shell — layered depth effect**
  - `dashboard-shell.tsx`: `<main>` gets `bg-background md:rounded-tl-2xl`, flex-1 overflow-hidden for chat tab
  - Header uses `bg-sidebar text-sidebar-foreground` for depth continuity
  - `globals.css`: sidebar background changed to primary dark color (`oklch(12.9% 0.042 264.695)`)

- [x] **2. Chat tab — split-panel layout**
  - `chat-tab.tsx`: Side-by-side layout (conversation list | message thread)
  - Left panel: `w-70` (sidebar collapsed) / `w-50` (sidebar expanded), `rounded-tl-2xl`
  - Right panel: `bg-background rounded-tl-2xl` with subtle inset shadow
  - Empty state when no conversation selected

- [x] **3. Conversation list — compact mode**
  - `chat-conversation-list.tsx`: Added `compact` and `darkBg` props
  - Compact (sidebar expanded): avatar + last message snippet only
  - Full (sidebar collapsed): avatar + name + pet + last message + timestamp

- [x] **4. Message thread — split-mode adjustments**
  - `chat-message-thread.tsx`: Added `showBack` prop (default true), hidden in split mode

- [x] **5. Dark sidebar + active states**
  - `globals.css`: sidebar-background = primary, sidebar-foreground = light, sidebar-border = transparent
  - Active state: `--color-sidebar-accent: var(--color-pop-900)`, `--color-sidebar-accent-foreground: var(--color-pop-550)`
  - No sidebar border (transparent)
  - Header and notification bell updated with sidebar-aware text colors

- [x] **6. Visual verification**
  - Mascotas tab: dark sidebar, rounded content area, pop active state ✓
  - Chat tab: split layout, conversation list readable, empty state ✓
  - Chat thread: messages render correctly in split mode ✓

## Review

### Files changed
- `app/globals.css` — dark sidebar tokens, sidebar-accent = pop colors, border = transparent
- `components/dashboard/rescue-center/dashboard-shell.tsx` — header sidebar-aware colors, main rounded-tl-2xl, chat flex layout
- `components/dashboard/rescue-center/chat-tab.tsx` — split-panel layout with useSidebar() responsive widths
- `components/dashboard/rescue-center/rescue-center-sidebar.tsx` — footer avatar/text colors (user changes)
- `components/dashboard/rescue-center/notification-bell.tsx` — sidebar-aware button colors
- `components/chat/chat-conversation-list.tsx` — compact mode, darkBg prop, activeConversationId highlight
- `components/chat/chat-message-thread.tsx` — showBack prop

### Summary
Transformed the dashboard into a Slack-like layered UI: dark sidebar (primary color) with pop-colored active states, borderless, with the content area sitting "on top" via `rounded-tl-2xl`. Chat tab now uses a persistent split layout (conversation list always visible on left, message thread on right) that adapts to sidebar state.
