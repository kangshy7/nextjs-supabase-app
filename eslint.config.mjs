import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettierConfig from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // 자동 생성 파일 및 빌드 산출물 제외
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "*.min.js"],
  },

  // Next.js 권장 규칙 (core-web-vitals + TypeScript 포함)
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 프로젝트 커스텀 규칙
  {
    rules: {
      // CLAUDE.md: "any 타입 사용 금지"
      "@typescript-eslint/no-explicit-any": "error",

      // 미사용 변수 - 언더스코어 접두사 허용
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // type import를 일반 import와 분리 강제 (TypeScript 5 최적화)
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // 디버그 console.log 감지 (warn/error는 허용)
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Prettier 충돌 규칙 비활성화 - 반드시 마지막에 위치
  prettierConfig,
];

export default eslintConfig;
