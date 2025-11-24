# Vue Grab for Claude Code 🎯

A browser extension that lets you click any Vue component on a webpage and extract its full context (props, state, methods, template) to share with Claude Code.

## Features

- 🎯 **Click to Extract**: Click any element to grab its Vue component data
- 📋 **Auto-Copy**: Automatically copies formatted component context to clipboard
- 🎼 **Cursor & Windsurf Links**: Send extracted context directly to your editor through deep links
- 🗂️ **Pinia Store Detection**: Automatically detects and extracts Pinia store state, getters, and actions
- 📦 **Vuex Store Detection**: Captures Vuex state, getters, mutations, and actions
- 🔍 **TanStack Query Support**: Extracts active queries with their status, data, and metadata
- 🎯 **Smart Filtering**: Identifies which stores and queries are actually used by the component
- 👁️ **Visual Feedback**: Hover highlighting shows component names
- ⌨️ **Keyboard Shortcuts**: Press `Esc` to cancel grabbing mode
- 🔄 **Vue 2 & 3 Support**: Works with both major Vue versions
- 🎨 **Beautiful UI**: Clean, modern interface with toast notifications

## Installation

### Chrome/Edge (Developer Mode)

1. Clone or download this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `vue-grab` folder (the root of this repository)
6. The extension icon should appear in your toolbar

### Firefox (Temporary)

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `vue-grab` folder

## Usage

1. **Navigate** to any page with a Vue.js application
2. **Click** the Vue Grab extension icon in your toolbar
3. **Click** "Start Grabbing"
4. **Hover** over elements to see component names
5. **Click** any element to extract its component data
6. **Choose your workflow**:
   - The component data is automatically copied to your clipboard
   - Hold `⌘/Ctrl` while clicking (or pressing `Enter`) to copy and open your editor via deep link
   - Paste into Claude Code chat to get contextual help!

### Editor Deep Links

After grabbing a component, you can:
- Hold `⌘/Ctrl` when clicking (or pressing `Enter`) to copy and immediately open the associated file in Cursor or Windsurf via their URL schemes
- Re-open the popup and click **Open in Editor** to deep link to the captured file path later

No local files are written—everything stays in your clipboard and editor.

## What Gets Extracted

### Component Data
- Component name and file path
- All props with current values
- Component data/state (both Options API and Composition API)
- List of computed properties
- List of methods
- Template (when available)
- Element details (tag, ID, classes, attributes)

### Pinia Stores (if detected)
- Store IDs and their current state
- Getter values
- Available actions
- **Smart Detection**: Identifies which stores are "definitely used", "potentially related", or just "available"

### Vuex Store (if detected)
- Full store state
- All getter values
- Available mutations and actions
- Store modules
- **Smart Detection**: Identifies which specific state paths and getters the component uses

### TanStack Query / Vue Query (if detected)
- Active query keys and their data
- Query status (loading, success, error, etc.)
- Fetch status and update counts
- Error messages (if any)
- Last updated timestamps
- **Smart Detection**: Identifies which queries are "definitely used" vs "potentially related"

## Example Output

```markdown
# Vue Component Context

## Component Information
- **Name**: TodoItem
- **File**: src/components/TodoItem.vue

## Element
- **Tag**: <div>
- **ID**: todo-123
- **Classes**: todo-item, completed

## Props
{
  "todo": {
    "id": 123,
    "text": "Buy groceries",
    "completed": true
  }
}

## Data/State
{
  "isEditing": false,
  "editText": ""
}

## Computed Properties
isCompleted, formattedDate

## Methods
toggleComplete, startEdit, saveEdit

## Pinia Stores

### Definitely Used by Component

#### Store: todos

**State:**
{
  "todos": [...],
  "filter": "all"
}

**Getters:**
{
  "completedTodos": [...],
  "activeTodos": [...]
}

**Actions:** addTodo, removeTodo, toggleTodo

### Potentially Related Stores
- **user**: 2 actions, 1 getters

## TanStack Query (Vue Query)

### Definitely Used by Component

#### Query: ["todos", "list"]
- **Status:** success
- **Fetch Status:** idle
- **Last Updated:** 2025-11-18T10:30:00.000Z
- **Data Updates:** 3

**Data:**
[...]
```

## Tips

- **Component Not Found?** Try clicking on a parent element - Vue Grab walks up the DOM tree to find components
- **Too Much Data?** The serializer limits depth to prevent overwhelming output
- **Esc Key**: Quickly cancel grab mode by pressing Escape
- **Keyboard Focus**: After activating, the popup auto-closes so you can immediately start clicking

## Troubleshooting

### "No Vue component found"
- Make sure you're on a page with Vue.js (check console for Vue devtools message)
- Try clicking different elements - some elements might not be directly tied to a component
- Vue production builds may have limited component information

### Store/Query data not showing
- Make sure the application is actually using Pinia/Vuex/TanStack Query
- In production builds, some internals may not be accessible
- Check browser console for any error messages
- The extension tries multiple detection methods but may not work with all setups

### "Open in Editor" button not appearing
- The button only appears after you've grabbed a component
- Click "Start Grabbing", capture a component, then reopen the popup

### Extension not working
- Refresh the page after installing the extension
- Check that the extension is enabled in `chrome://extensions/`
- Open DevTools console to see any error messages

## Development

Vue Grab is built with TypeScript for type safety and better developer experience.

### Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Watch mode for development (auto-rebuild on file changes)
npm run watch
```

### Project Structure

```bash
vue-grab/
├── src/                # TypeScript source files
│   ├── constants.ts   # Shared configuration constants
│   ├── types.ts       # TypeScript type definitions
│   ├── popup.ts       # Popup logic
│   ├── content.ts     # Main grabbing logic (content script)
│   ├── content.css    # Styles for highlights/toasts
│   └── injected.ts    # Vue internals access (page context)
├── dist/              # Compiled JavaScript (load this in browser)
├── manifest.json      # Extension configuration
├── popup.html         # Extension popup UI
├── icons/             # Extension icons
├── package.json       # Dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

### Build Scripts

- `npm run build` - Compile TypeScript and copy assets to dist/
- `npm run watch` - Watch mode for development
- `npm run clean` - Remove dist/ directory
- `npm run rebuild` - Clean and rebuild from scratch

### Loading the Extension

1. Run `npm run build` to compile TypeScript
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` folder (not the root folder!)

### Making Changes

1. Edit TypeScript files in `src/`
2. Run `npm run watch` for auto-compilation
3. Reload the extension in `chrome://extensions/`
4. Refresh the page you're testing on

### TODO / Ideas

**Completed Features:**
- [x] Add actual extension icons ✅
- [x] Support for Pinia/Vuex state extraction ✅
- [x] Editor deep links for Cursor/Windsurf ✅
- [x] TanStack Query/Vue Query support ✅
- [x] Smart filtering to detect component usage ✅
- [x] Vue Router route information ✅
- [x] Provide/Inject values extraction ✅
- [x] Emitted events detection ✅
- [x] Slots extraction ✅
- [x] Component hierarchy navigation (Alt+↑↓) ✅

**Future Ideas:**
- [ ] Direct integration with Claude Code API
- [ ] Enhanced component hierarchy visualization
- [ ] Filter sensitive data (passwords, tokens, etc.)
- [ ] Background script for better deep linking support
- [ ] Publish to Chrome Web Store
- [ ] Firefox Add-ons distribution

**Recently Completed:**
- [x] Full TypeScript conversion ✅
- [x] Build system with watch mode ✅
- [x] Comprehensive type definitions ✅

## Contributing

Found a bug? Have an idea? PRs welcome!

## License

MIT - Go wild! 🚀
