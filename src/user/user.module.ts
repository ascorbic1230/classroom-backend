import { Module } from '@nestjs/common';
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from '@nestjs/mongoose';
import { UserModel, UserSchema } from './schemas/user.schema';
import { UserService } from "./user.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ConfigurationModule } from "@/config/configuration.module";
import { JwtStrategy } from "./jwt.strategy";

@Module({
	imports: [
		ConfigurationModule,
		JwtModule.registerAsync({
			useFactory: async (configService: ConfigService) => {
				return {
					//TODO: replace this by configService later
					secret: configService.get('JWT_SECRET'),
					signOptions: {
						expiresIn: '100d',
					},
				}
			},
			inject: [ConfigService],
		}),
		MongooseModule.forFeature([
			{ name: UserModel.name, schema: UserSchema },
		]),
	],
	exports: [UserService],
	providers: [UserService, JwtStrategy],
})
export class UserModule { }
