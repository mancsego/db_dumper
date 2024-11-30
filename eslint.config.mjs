// @ts-check

import globals from 'globals'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  }
)

//  languageOptions: {
//       globals: { ...globals.browser, ...globals.node }
//     },
//     rules: {
//       'no-unused-vars': [
//         'error',
//         {
//           argsIgnorePattern: '^_',
//           varsIgnorePattern: '^_',
//           caughtErrorsIgnorePattern: '^_'
//         }
//       ]
//     }
