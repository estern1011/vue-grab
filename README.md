# Vue Grab for Claude Code 🎯

A browser extension that lets you click any Vue component on a webpage and extract its full context (props, state, methods, template) to share with Claude Code.

## Features

- 🎯 **Click to Extract**: Click any element to grab its Vue component data
- 📋 **Auto-Copy**: Automatically copies formatted component context to clipboard
- 🎼 **Cursor Composer Integration**: Send extracted context directly to Cursor with one click
- 📁 **File Export**: Saves to `.cursor/context/vue-grab-latest.md` for automatic context pickup
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
5. Select the `vue-grab-extension` folder
6. The extension icon should appear in your toolbar

### Firefox (Temporary)

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `vue-grab-extension` folder

## Usage

1. **Navigate** to any page with a Vue.js application
2. **Click** the Vue Grab extension icon in your toolbar
3. **Click** "Start Grabbing"
4. **Hover** over elements to see component names
5. **Click** any element to extract its component data
6. **Choose your workflow**:
   - The component data is automatically copied to your clipboard
   - Click "Send to Cursor Composer" to save to `.cursor/context/vue-grab-latest.md`
   - Paste into Claude Code chat to get contextual help!

### Cursor Integration

After grabbing a component, click the "Send to Cursor Composer" button to:
- Save the context to `.cursor/context/vue-grab-latest.md` in your Downloads folder
- Move this file to your project's `.cursor/context/` directory for automatic pickup by Cursor
- Optionally try deep linking with `cursor://` protocol (if configured)

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

### "Send to Cursor" button not appearing
- The button only appears after you've grabbed a component
- Click "Start Grabbing" and select a component first

### Download failed
- Check that you've granted the extension "downloads" permission
- The file will be saved to your Downloads folder as `.cursor/context/vue-grab-latest.md`
- You may need to manually move it to your project's `.cursor/context/` directory

### Extension not working
- Refresh the page after installing the extension
- Check that the extension is enabled in `chrome://extensions/`
- Open DevTools console to see any error messages

## Development

Want to customize or extend Vue Grab?

```bash
# Project structure
vue-grab-extension/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup UI
├── popup.js          # Popup logic
├── content.js        # Main grabbing logic
├── content.css       # Styles for highlights/toasts
└── icons/           # Extension icons (add your own!)
```

### TODO / Ideas

- [ ] Add actual extension icons (currently placeholders)
- [x] Support for Pinia/Vuex state extraction ✅
- [x] Export to Markdown files ✅
- [x] Cursor Composer integration ✅
- [x] TanStack Query/Vue Query support ✅
- [x] Smart filtering to detect component usage ✅
- [ ] Direct integration with Claude Code API
- [ ] Vue Router route information
- [ ] Component hierarchy visualization
- [ ] Filter sensitive data (passwords, tokens, etc.)
- [ ] Background script for better deep linking support

## Contributing

Found a bug? Have an idea? PRs welcome!

## License

MIT - Go wild! 🚀
