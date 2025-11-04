import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(() => ({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@lexical-playground": path.resolve(
                __dirname,
                "src/Lexical/lexical-playground/src"
            ),
            shared: path.resolve(__dirname, "src/Lexical/shared/src"),
            lexical: path.resolve(__dirname, "node_modules/lexical"),
            "@lexical/react": path.resolve(
                __dirname,
                "node_modules/@lexical/react"
            ),
        },
    },
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
        },
        host: true,
    },
    build: {
        outDir: "dist/client",
    },
}));
