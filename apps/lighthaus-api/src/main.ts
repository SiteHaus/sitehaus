import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [process.env.LIGHTHAUS_UI_ORIGIN ?? "https://status.sitehaus.dev"],
    credentials: true,
  });
  const config = app.get(ConfigService);
  await app.listen(config.get<number>("lighthaus.port")!);
  Logger.log(`lighthaus-api listening on :${config.get<number>("lighthaus.port")}`, "Bootstrap");
}
bootstrap();
