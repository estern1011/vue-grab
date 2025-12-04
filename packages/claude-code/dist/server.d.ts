export interface VueGrabContext {
    type: string;
    source: string;
    timestamp: number;
    content: string;
    components: Array<{
        name: string;
        filePath: string | null;
        note: string;
    }>;
}
export interface ServerOptions {
    port?: number;
    autoClipboard?: boolean;
    saveToFile?: boolean;
    contextFile?: string;
    silent?: boolean;
}
export declare function createServer(options?: ServerOptions): {
    app: import("express-serve-static-core").Express;
    opts: {
        port: number;
        autoClipboard: boolean;
        saveToFile: boolean;
        contextFile: string;
        silent: boolean;
    };
};
export declare function startServer(options?: ServerOptions): Promise<void>;
