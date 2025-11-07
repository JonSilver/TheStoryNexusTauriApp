import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactHooksAddons from "eslint-plugin-react-hooks-addons";
import globals from "globals";

// Filter out globals with leading/trailing whitespace (bug in globals package)
const cleanGlobals = (globalsObj) => {
    return Object.fromEntries(
        Object.entries(globalsObj).filter(([key]) => key.trim() === key)
    );
};

export default [
    // Global ignores (replaces .eslintignore)
    {
        ignores: ["node_modules/**", "dist/**", "build/**", "*.config.js", "*.config.ts"]
    },

    // Base configuration for all files
    js.configs.recommended,

    // TypeScript and React configuration
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        languageOptions: {
            parser: typescriptParser,
            ecmaVersion: 2021,
            sourceType: "module",
            globals: {
                ...cleanGlobals(globals.browser),
                ...cleanGlobals(globals.node),
                React: "readonly",
                JSX: "readonly",
                RequestInit: "readonly"
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                }
            }
        },
        plugins: {
            react,
            "react-hooks": reactHooks,
            "react-hooks-addons": reactHooksAddons,
            "@typescript-eslint": typescript,
            prettier
        },
        rules: {
            // Base ESLint rules
            semi: ["warn", "always"],
            "no-undef": "error",
            "no-template-curly-in-string": "off",
            "no-useless-escape": "warn",
            "no-unused-vars": "off", // Turned off in favor of TypeScript rule
            curly: ["warn", "multi-or-nest"],
            "arrow-body-style": ["warn", "as-needed"],

            // TypeScript rules
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_"
                }
            ],

            // React rules
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off", // TypeScript handles this

            // React Hooks rules
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react-hooks-addons/no-unused-deps": "warn",

            // Prettier rules
            "prettier/prettier": "warn"
        },
        settings: {
            react: {
                version: "detect"
            }
        }
    },

    // Apply TypeScript recommended rules
    {
        files: ["**/*.{ts,tsx}"],
        rules: {
            ...typescript.configs.recommended.rules,
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_"
                }
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn"
        }
    },

    // Prettier config (should be last to override other formatting rules)
    prettierConfig
];
