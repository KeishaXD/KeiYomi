import js from '@eslint/js';
import globals from 'globals';

const commonRules = {
    'no-control-regex': 'off',
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
        varsIgnorePattern: '^_'
    }],
    'no-useless-escape': 'off'
};

export default [
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'vendor/**'
        ]
    },
    js.configs.recommended,
    {
        files: ['Script/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                ...globals.node
            }
        },
        rules: commonRules
    },
    {
        files: ['UI/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: {
                ...globals.browser,
                JSZip: 'readonly',
                mammoth: 'readonly',
                marked: 'readonly',
                pdfjsLib: 'readonly'
            }
        },
        rules: {
            ...commonRules,
            // UI files are loaded as classic scripts and share globals across files.
            'no-case-declarations': 'off',
            'no-undef': 'off',
            'no-unused-vars': 'off',
            'no-useless-assignment': 'off'
        }
    }
];
