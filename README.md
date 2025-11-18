# Vue Grab for Claude Code 🎯

A browser extension that lets you click any Vue component on a webpage and extract its full context (props, state, methods, template) to share with Claude Code.

## Features

- 🎯 **Click to Extract**: Click any element to grab its Vue component data
- 📋 **Auto-Copy**: Automatically copies formatted component context to clipboard
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
6. **Paste** into Claude Code chat to get contextual help!

The component data is automatically copied to your clipboard in a Claude-friendly format.

## What Gets Extracted

- Component name and file path
- All props with current values
- Component data/state (both Options API and Composition API)
- List of computed properties
- List of methods
- Template (when available)
- Element details (tag, ID, classes, attributes)

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
- [ ] Support for Pinia/Vuex state extraction
- [ ] Export to JSON/Markdown files
- [ ] Direct integration with Claude Code API
- [ ] Vue Router route information
- [ ] Component hierarchy visualization
- [ ] Filter sensitive data (passwords, tokens, etc.)

## Contributing

Found a bug? Have an idea? PRs welcome!

## License

MIT - Go wild! 🚀
