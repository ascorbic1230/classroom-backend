import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from "@nestjs/mongoose";
import { UserModel, UserSchema } from "../user/schemas/user.schema";
import { UserModule } from "../user/user.module";
import { MailModule } from "../mail/mail.module";
import { RedisModule } from "src/redis/redis.module";
@Module({
	imports: [
		UserModule,
		MailModule,
		RedisModule,
		MongooseModule.forFeature([{ name: UserModel.name, schema: UserSchema }]),
	],
	providers: [AuthService],
	controllers: [AuthController]
})
export class AuthModule { }
