import express from 'express';
import cors from 'cors';
import clipboardy from 'clipboardy';
import fs from 'fs';
import path from 'path';
import os from 'os';
const DEFAULT_OPTIONS = {
    port: 4567,
    autoClipboard: true,
    saveToFile: true,
    contextFile: path.join(os.tmpdir(), 'vue-grab-context.md'),
    silent: false
};
export function createServer(options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const app = express();
    // Store latest context
    let latestContext = null;
    let contextHistory = [];
    // Middleware
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    // Health check endpoint
    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            service: 'vue-grab-claude-code',
            version: '1.0.0',
            hasContext: latestContext !== null,
            contextCount: contextHistory.length
        });
    });
    // Receive context from Vue Grab extension
    app.post('/context', async (req, res) => {
        try {
            const context = req.body;
            if (!context || !context.content) {
                res.status(400).json({ error: 'Invalid context payload' });
                return;
            }
            latestContext = context;
            contextHistory.push(context);
            // Keep only last 10 contexts
            if (contextHistory.length > 10) {
                contextHistory = contextHistory.slice(-10);
            }
            const componentNames = context.components?.map(c => c.name).join(', ') || 'Unknown';
            if (!opts.silent) {
                console.log('\n' + '='.repeat(60));
                console.log('Received Vue component context from browser');
                console.log('='.repeat(60));
                console.log(`Components: ${componentNames}`);
                console.log(`Timestamp: ${new Date(context.timestamp).toLocaleString()}`);
                console.log('='.repeat(60) + '\n');
            }
            // Auto-copy to clipboard
            if (opts.autoClipboard) {
                try {
                    await clipboardy.write(context.content);
                    if (!opts.silent) {
                        console.log('Context copied to clipboard automatically');
                    }
                }
                catch (err) {
                    console.error('Failed to copy to clipboard:', err);
                }
            }
            // Save to file for Claude Code to read
            if (opts.saveToFile) {
                try {
                    fs.writeFileSync(opts.contextFile, context.content, 'utf-8');
                    if (!opts.silent) {
                        console.log(`Context saved to: ${opts.contextFile}`);
                    }
                }
                catch (err) {
                    console.error('Failed to save context file:', err);
                }
            }
            res.json({
                success: true,
                message: 'Context received',
                components: context.components?.length || 0,
                clipboard: opts.autoClipboard,
                file: opts.saveToFile ? opts.contextFile : null
            });
        }
        catch (error) {
            console.error('Error processing context:', error);
            res.status(500).json({ error: 'Failed to process context' });
        }
    });
    // Get latest context
    app.get('/context', (_req, res) => {
        if (!latestContext) {
            res.status(404).json({ error: 'No context available' });
            return;
        }
        res.json(latestContext);
    });
    // Get context history
    app.get('/history', (_req, res) => {
        res.json({
            count: contextHistory.length,
            contexts: contextHistory.map((c, i) => ({
                index: i,
                timestamp: c.timestamp,
                components: c.components?.map(comp => comp.name) || []
            }))
        });
    });
    // Clear context
    app.delete('/context', (_req, res) => {
        latestContext = null;
        contextHistory = [];
        res.json({ success: true, message: 'Context cleared' });
    });
    return { app, opts };
}
export function startServer(options = {}) {
    return new Promise((resolve) => {
        const { app, opts } = createServer(options);
        app.listen(opts.port, () => {
            console.log('\n' + '='.repeat(60));
            console.log('  Vue Grab - Claude Code Server');
            console.log('='.repeat(60));
            console.log(`  Server running on http://localhost:${opts.port}`);
            console.log('');
            console.log('  Endpoints:');
            console.log(`    GET  /health   - Health check`);
            console.log(`    POST /context  - Receive context from extension`);
            console.log(`    GET  /context  - Get latest context`);
            console.log(`    GET  /history  - Get context history`);
            console.log('');
            console.log('  Options:');
            console.log(`    Auto-clipboard: ${opts.autoClipboard ? 'enabled' : 'disabled'}`);
            console.log(`    Save to file:   ${opts.saveToFile ? opts.contextFile : 'disabled'}`);
            console.log('');
            console.log('  Waiting for Vue Grab extension to send context...');
            console.log('='.repeat(60) + '\n');
            resolve();
        });
    });
}
