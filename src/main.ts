import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

import 'dotenv/config';
import { LogLevel, ValidationPipe } from "@nestjs/common";

async function bootstrap() {
	const logger: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose'];
	const app = await NestFactory.create(AppModule, { logger });

	// Set config
	const configService: ConfigService = app.get(ConfigService);
	const isEnableCors = configService.get('ENABLE_CORS');
	if (isEnableCors) {
		app.enableCors({
			origin: configService.get('FRONTEND_URL'),
			credentials: true,
		});
	}

	app.use(cookieParser());
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
		}),
	);
	const port = configService.get('PORT');
	await app.listen(port);
	console.log(`Application is running on: ${await app.getUrl()} (CORS = ${isEnableCors})`)
}
bootstrap();
