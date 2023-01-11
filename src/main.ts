import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

import 'dotenv/config';
import { LogLevel, ValidationPipe } from "@nestjs/common";

async function bootstrap() {
	const logger: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose'];
	const app = await NestFactory.create(AppModule, { logger });
	const configService: ConfigService = app.get(ConfigService);

	console.log(configService.get('ENABLE_CORS'))
	console.log(configService.get('FRONTEND_URL'))
	console.log(configService.get('BASE_URL'))
	console.log(configService.get('MONGODB_URI'))
	console.log(configService.get('REDIS_HOST'))

	// Set config
	const isDisableCors = configService.get('ENABLE_CORS') === 'false';
	if (!isDisableCors) {
		app.enableCors({
			origin: configService.get('FRONTEND_URL'),
			credentials: true,
		});
		console.log('CORS enabled!')
	}

	app.use(cookieParser());
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
		}),
	);
	const port = configService.get('PORT');
	await app.listen(port);
	console.log(`Application is running on: ${await app.getUrl()}`)
}
bootstrap();
