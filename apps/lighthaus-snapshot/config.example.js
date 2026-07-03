// Optional deploy-time override for the snapshot data source.
//
// Copy to `config.js` (which index.html loads) only if you are NOT proxying
// `/status.json` from the same origin. If the Cloudflare Pages project redirects
// or binds `/status.json` to the R2 bucket, you can skip this file entirely and
// the page will use its `./status.json` default.
//
// Point this at the public R2 URL that lighthaus-api writes `status.json` to.
window.STATUS_SRC = "https://status-data.sitehaus.dev/status.json";
