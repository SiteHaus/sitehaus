import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

// Origins allowed to read the status API from a browser. Production is locked to
// LIGHTHAUS_UI_ORIGIN (comma-separated for multiple, e.g. prod + staging) — the
// localhost/dev conveniences are added ONLY outside production, so prod CORS is
// never widened to localhost (which, with credentials, would let a page on a
// user's machine make authenticated cross-origin calls).
function allowedOrigins(): string[] {
  const configured = (process.env.LIGHTHAUS_UI_ORIGIN ?? "https://status.sitehaus.dev")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === "production") return configured;
  return [
    ...configured,
    "http://localhost:3006",
    "https://status.localhost",
    "https://status.staging.sitehaus.dev",
  ];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
  });
  const config = app.get(ConfigService);
  await app.listen(config.get<number>("lighthaus.port")!);
  Logger.log(`lighthaus-api listening on :${config.get<number>("lighthaus.port")}`, "Bootstrap");
}
bootstrap();
