import { DAOModule } from "@/dao/dao.module";
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UserModel, UserSchema } from "@/dao/schemas/user.schema";

@Module({
	imports: [
		DAOModule,
		MongooseModule.forFeature([{ name: UserModel.name, schema: UserSchema }]),
	],
	providers: [AuthService],
	controllers: [AuthController]
})
export class AuthModule { }
