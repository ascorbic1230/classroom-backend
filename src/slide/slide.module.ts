import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from '@nestjs/mongoose';
import { SlideController } from './slide.controller';
import { SlideService } from './slide.service';
import { SlideModel, SlideSchema } from './schemas/slide.schema';
import { PresentationModule } from "../presentation/presentation.module";
import { UserModule } from "../user/user.module";

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: SlideModel.name, schema: SlideSchema },
		]),
		forwardRef(() => PresentationModule),
		UserModule,
		JwtModule.registerAsync({
			useFactory: (configService: ConfigService) => ({
				secret: configService.get('JWT_SECRET'),
				signOptions: { expiresIn: '7d' },
			}),
			inject: [ConfigService],
		}),
	],
	controllers: [SlideController],
	providers: [SlideService],
	exports: [SlideService],
})
export class SlideModule { }