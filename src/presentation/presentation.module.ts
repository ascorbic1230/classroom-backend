import { UserModule } from "../user/user.module";
import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from '@nestjs/mongoose';
import { PresentationController } from './presentation.controller';
import { PresentationService } from './presentation.service';
import { PresentationModel, PresentationSchema } from './schemas/presentation.schema';
import { SlideModule } from "../slide/slide.module";
import { RedisModule } from "src/redis/redis.module";

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: PresentationModel.name, schema: PresentationSchema },
		]),
		UserModule,
		forwardRef(() => SlideModule),
		RedisModule,
		JwtModule.registerAsync({
			useFactory: (configService: ConfigService) => ({
				secret: configService.get('JWT_SECRET'),
				signOptions: { expiresIn: '7d' },
			}),
			inject: [ConfigService],
		}),
	],
	controllers: [PresentationController],
	providers: [PresentationService],
	exports: [PresentationService],
})
export class PresentationModule { }