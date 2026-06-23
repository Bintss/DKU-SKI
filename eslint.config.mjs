import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // 프로필 로드 후 비동기 fetch하는 패턴(useEffect 안에서 fetchData 호출)은
      // React 공식 문서가 권장하는 "외부 시스템과의 동기화" 용도에 해당함.
      // 이 프로젝트의 모든 페이지가 동일 패턴을 쓰므로 룰을 끈다.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;