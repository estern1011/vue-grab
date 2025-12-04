# @vue-grab/claude-code

Claude Code server integration for Vue Grab - receive Vue component context directly from your browser without copy-pasting.

## Quick Start

```bash
# Start the server (runs on port 4567)
npx @vue-grab/claude-code
```

That's it! The Vue Grab extension will automatically detect the server and show a "Send to Claude Code" button.

## How It Works

```
┌─────────────────┐                         ┌─────────────────┐
│  Vue Grab       │  ──── POST JSON ────►   │  This Server    │
│  Extension      │      localhost:4567     │  (port 4567)    │
└─────────────────┘                         └─────────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────────┐
                                            │  - Clipboard    │
                                            │  - Temp file    │
                                            └─────────────────┘
```

1. **Start the server** before using Vue Grab
2. **Open Vue Grab** - it will detect the server automatically (green dot indicator)
3. **Click components** to add them to your scratchpad with notes
4. **Click "Send to Claude Code"** - context is instantly:
   - Copied to your clipboard
   - Saved to a temp file (`/tmp/vue-grab-context.md`)
5. **Paste into Claude Code** or reference the file

## Usage with Dev Server

Run alongside your dev server:

```bash
# Option 1: Run in background
npx @vue-grab/claude-code & npm run dev

# Option 2: Add to package.json scripts
{
  "scripts": {
    "dev": "npx @vue-grab/claude-code & vite",
    "dev:grab": "concurrently \"npx @vue-grab/claude-code\" \"vite\""
  }
}
```

## CLI Options

```bash
npx @vue-grab/claude-code [options]

Options:
  -p, --port <port>    Server port (default: 4567)
  --no-clipboard       Don't auto-copy context to clipboard
  --no-file            Don't save context to file
  -f, --file <path>    Custom context file path
  -s, --silent         Suppress output messages
  -h, --help           Show help
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check - returns server status |
| `/context` | POST | Receive context from Vue Grab extension |
| `/context` | GET | Get the latest received context |
| `/history` | GET | Get history of received contexts |
| `/context` | DELETE | Clear stored context |

## Programmatic Usage

```typescript
import { startServer, createServer } from '@vue-grab/claude-code';

// Simple start
await startServer({ port: 4567 });

// Or create server for custom setup
const { app, opts } = createServer({
  port: 4567,
  autoClipboard: true,
  saveToFile: true,
  contextFile: '/custom/path/context.md'
});

app.listen(opts.port);
```

## Payload Format

The extension sends context in this format:

```json
{
  "type": "vue-grab-context",
  "source": "vue-grab-extension",
  "timestamp": 1699999999999,
  "content": "# Vue Component Context...",
  "components": [
    {
      "name": "MyComponent",
      "filePath": "/src/components/MyComponent.vue",
      "note": "User's note about this component"
    }
  ]
}
```

## License

MIT
