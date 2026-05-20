import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
    {
        ignores: [
            'node_modules/**',
            'subagents/**',
            'skills/**',
            '.claude/**',
            'public/sprites/**',
            'bun.lockb',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['server.ts'],
        languageOptions: {
            globals: { ...globals.node, Bun: 'readonly' },
        },
    },
    {
        files: ['public/**/*.ts'],
        languageOptions: {
            globals: globals.browser,
        },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
];
