import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  pluginJs.configs.recommended,
  {
    plugins: ["prettier"],  // Ajoute Prettier comme plugin
    extends: ["plugin:prettier/recommended"],  // Charge la configuration Prettier recommandée
    rules: {
      // Tu peux ajouter des règles supplémentaires ici si nécessaire
      "prettier/prettier": "error",  // Signale les violations de formatage Prettier comme erreurs
    },
  },
];
