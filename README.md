# Vue Grab

Chrome extension that extracts Vue component context for AI coding agents. Click a component in your running app and get its props, state, stores, routes, and DOM locators — ready to paste into Claude Code, Cursor, or any clipboard workflow.

**[Try it live](https://vue-grab.vercel.app)**

## What it extracts

- Props, data, computed, and refs (Composition API & Options API)
- Pinia, Vuex, and Vue Query store state, getters, and actions
- Vue Router params, query, meta, and matched routes
- CSS selectors, XPath, bounding box, and page URL
- Component hierarchy with parent/child navigation
- Provide/inject values, emitted events, and slots

## Install

```bash
git clone https://github.com/estern1011/vue-grab.git
cd vue-grab && npm install && npm run build
```

Then in Chrome: `chrome://extensions` → Enable Developer Mode → Load Unpacked → select the `dist/` folder.

## Usage

1. Press `Alt+Shift+V` (or click the extension icon) on any Vue app
2. Hover to see component names, click to grab
3. Navigate the component tree with `Alt+Up/Down`
4. Add comments per component, multi-select as many as you need
5. Copy all to clipboard or send directly to Cursor via deep link

## Project structure

```
vue-grab/
├── src/
│   ├── background.ts       # Service worker
│   ├── content.ts           # Content script — overlay & grab UI
│   ├── content.css          # Highlight & toast styles
│   ├── popup.ts             # Extension popup
│   ├── popup.html           # Popup UI
│   ├── injected/            # Runs in page context
│   │   ├── index.ts         # Entry — bridges to content script
│   │   ├── detection.ts     # Vue instance detection
│   │   ├── extraction.ts    # Component data extraction
│   │   ├── stores.ts        # Pinia/Vuex/Vue Query extraction
│   │   ├── features.ts      # Router, provide/inject, slots, events
│   │   ├── serialization.ts # Safe serialization with depth limits
│   │   └── types.ts         # Shared types
│   ├── constants.ts
│   ├── types.ts
│   └── global.d.ts
├── site/                    # Demo site (Nuxt)
├── manifest.json
└── package.json
```

## Development

```bash
npm run build    # Build extension to dist/
npm run dev      # Watch mode — rebuilds on file changes
```

## License

MIT
