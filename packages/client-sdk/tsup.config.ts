import { defineConfig } from "tsup";

export default defineConfig([
  // NestJS bundle — keep @nestjs/* external, bundle @site-haus/* inline
  {
    entry: { "nestjs/index": "src/nestjs/index.ts" },
    format: ["esm"],
    dts: true,
    clean: false,
    external: ["@nestjs/common", "@nestjs/core", "reflect-metadata", "rxjs"],
    noExternal: [/@site-haus\/.*/],
  },
  // Frontend bundle — keep react/zustand/ts-rest external, bundle @site-haus/* inline
  {
    entry: { "frontend/index": "src/frontend/index.ts" },
    format: ["esm"],
    dts: { resolve: true },
    clean: false,
    external: ["react", "react-dom", "zustand", "@ts-rest/core", "zod", "axios"],
    noExternal: [/@site-haus\/.*/],
  },
]);
