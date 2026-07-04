# Task 4 - App Shell Notion-style Redesign

## Task
Redesign the Tenets Tender Ecosystem app shell to look like Notion (notion.so).

## Work Done

### Complete rewrite of `/home/z/my-project/src/components/app-shell.tsx`

**Sidebar (Left Panel):**
- Collapsible sidebar: 240px expanded → 60px icon-only rail
- Workspace switcher: Emerald "T" avatar + "Tenets" label at top
- Three sections: Favorites, Workspace, Tools - with collapsible section headers
- Nav items show emoji + label in expanded mode, icon + tooltip in collapsed mode
- Active item: subtle `bg-primary/8 text-primary` highlight
- Hover effects on all items
- Bottom section: User avatar + name + email + hover-to-reveal sign out button (expanded), icon-only with tooltip (collapsed)
- Smooth collapse/expand animation with framer-motion `motion.aside`
- Collapse toggle: PanelLeftClose/PanelLeft icons

**Top Bar (Breadcrumb Navigation):**
- Compact 44px height bar with breadcrumb: Tenets > Section > Page
- Clickable breadcrumb items navigate back
- Right side: Search button with ⌘K label, Theme toggle, Notifications bell, User avatar dropdown
- User avatar dropdown includes Profile, Documents, and Sign Out

**Search Dialog (Cmd+K):**
- Full search overlay with backdrop blur
- Filters nav items by query
- Keyboard navigation hints at bottom
- Auto-focus input, ESC to close, Enter to select first result
- Global keyboard shortcut Cmd+K / Ctrl+K registered

**Content Area:**
- Smooth page transitions with framer-motion AnimatePresence
- Enter/exit animations with opacity + slight y offset

**Notification Dropdown:**
- Preserved and refined with Notion-style minimal design
- Cleaner spacing, smaller icons, subtle dividers

**Technical Details:**
- All existing imports and view routing logic preserved
- View routing switch statement unchanged
- NotificationDropdown component preserved
- SidebarContent component pattern kept but redesigned
- Sidebar collapse state via `useState`
- Cmd+K keyboard shortcut for search
- Tooltip component for collapsed sidebar items
- framer-motion for smooth transitions
- No lint errors
- Dev server compiles successfully

**Color Scheme:**
- Subtle emerald/teal primary with `bg-primary/8` for active items
- Sidebar uses slightly off-white (CSS variable approach)
- All colors use CSS variables for dark mode support

**Logout:**
- Accessible from sidebar bottom section (hover-to-reveal sign out button)
- Accessible from user avatar dropdown in top bar
- Both call the `logout` function from `useAuthStore`
