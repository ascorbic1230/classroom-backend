import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from "@nestjs/mongoose";
import { UserModel, UserSchema } from "src/user/schemas/user.schema";
import { UserModule } from "src/user/user.module";
import { MailModule } from "src/mail/mail.module";
@Module({
	imports: [
		UserModule,
		MailModule,
		MongooseModule.forFeature([{ name: UserModel.name, schema: UserSchema }]),
	],
	providers: [AuthService],
	controllers: [AuthController]
})
export class AuthModule { }
