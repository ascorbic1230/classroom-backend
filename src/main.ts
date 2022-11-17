import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

import 'dotenv/config';
import { LogLevel, ValidationPipe } from "@nestjs/common";

async function bootstrap() {
	const logger: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose'];
	const app = await NestFactory.create(AppModule, { logger });

	// Set config
	const configService: ConfigService = app.get(ConfigService);
	app.enableCors();
	app.use(cookieParser());
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
		}),
	);
	const port = configService.get('port') || 3000;
	await app.listen(port);
	console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
