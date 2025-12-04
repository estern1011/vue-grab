#!/usr/bin/env node

import { startServer, ServerOptions } from './server.js';

function parseArgs(): ServerOptions {
  const args = process.argv.slice(2);
  const options: ServerOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--port' || arg === '-p') {
      const port = parseInt(args[++i], 10);
      if (!isNaN(port)) {
        options.port = port;
      }
    } else if (arg === '--no-clipboard') {
      options.autoClipboard = false;
    } else if (arg === '--no-file') {
      options.saveToFile = false;
    } else if (arg === '--file' || arg === '-f') {
      options.contextFile = args[++i];
    } else if (arg === '--silent' || arg === '-s') {
      options.silent = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Vue Grab - Claude Code Server

Receives Vue component context from the Vue Grab browser extension
and makes it available to Claude Code.

Usage:
  npx @vue-grab/claude-code [options]
  vue-grab-claude [options]

Options:
  -p, --port <port>    Server port (default: 4567)
  --no-clipboard       Don't auto-copy context to clipboard
  --no-file            Don't save context to file
  -f, --file <path>    Custom context file path
  -s, --silent         Suppress output messages
  -h, --help           Show this help message

Examples:
  # Start with defaults (port 4567, auto-clipboard, save to file)
  npx @vue-grab/claude-code

  # Start on a different port
  npx @vue-grab/claude-code --port 4568

  # Run alongside your dev server
  npx @vue-grab/claude-code & npm run dev

How it works:
  1. Start this server before using Vue Grab
  2. The Vue Grab extension will detect the server automatically
  3. When you click "Send to Claude Code", context is:
     - Copied to your clipboard automatically
     - Saved to a temp file for Claude Code to read
  4. Paste the context into Claude Code or reference the file
`);
}

// Main
startServer(parseArgs()).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
