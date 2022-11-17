import { Module } from '@nestjs/common';
import {
	ConfigModule as NestConfigModule,
	ConfigService,
} from '@nestjs/config';
import { MongooseModule } from "@nestjs/mongoose";
import {
	configuration,
	validationSchema,
	type ConfigSchema,
} from './env.validation';
@Module({
	imports: [
		NestConfigModule.forRoot({
			load: [configuration],
			isGlobal: true,
			//ignoreEnvFile: true,
			validationSchema,
			validationOptions: { abortEarly: true },
		}),
		MongooseModule.forRootAsync({
			useFactory: async (config: ConfigService<ConfigSchema>) => ({
				uri: config.get('MONGODB_URI'),
			}),
			inject: [ConfigService],
		}),
	],
})
export class ConfigurationModule { }
