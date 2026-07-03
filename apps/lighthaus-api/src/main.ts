import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

// Origins allowed to read the status API from a browser. LIGHTHAUS_UI_ORIGIN
// may be a comma-separated list; dev origins are always included so the local
// status UI (direct :3006 or via Caddy) works without extra config.
function allowedOrigins(): string[] {
  const configured = (process.env.LIGHTHAUS_UI_ORIGIN ?? "https://status.sitehaus.dev")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
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
