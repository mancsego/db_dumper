// @ts-check
import globals from 'globals'
import eslint from '@eslint/js'
import tslint from 'typescript-eslint'

export default tslint.config(
  eslint.configs.recommended,
  tslint.configs.recommended,
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
