import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";

export default defineConfig({
  site: "https://docs.sitehaus.io",
  integrations: [
    starlight({
      title: "SiteHaus Docs",
      plugins: [starlightLinksValidator()],
      sidebar: [
        { label: "Architecture", autogenerate: { directory: "architecture" } },
        { label: "Identity & Auth", autogenerate: { directory: "domains/identity" } },
        { label: "Agency", autogenerate: { directory: "domains/agency" } },
        { label: "Commerce", autogenerate: { directory: "domains/commerce" } },
        { label: "Client Sites", autogenerate: { directory: "domains/client-sites" } },
        { label: "Standards", autogenerate: { directory: "standards" } },
        { label: "Troubleshooting", autogenerate: { directory: "troubleshooting" } },
        { label: "Findings", autogenerate: { directory: "findings" } },
      ],
    }),
  ],
});
