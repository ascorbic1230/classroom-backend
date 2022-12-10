import { MailModule } from "../mail/mail.module";
import { UserModule } from "../user/user.module";
import { Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from '@nestjs/mongoose';
import { PresentationController } from './presentation.controller';
import { PresentationService } from './presentation.service';
import { PresentationModel, PresentationSchema } from './schemas/presentation.schema';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: PresentationModel.name, schema: PresentationSchema },
		]),
		UserModule,
		MailModule,
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
})
export class PresentationModule { }