import { Module } from '@nestjs/common';
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from "@nestjs/passport";
import { UserModel, UserSchema } from '@/dao/schemas/user.schema';
import { UserService } from "./services/user.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ConfigurationModule } from "@/config/configuration.module";

@Module({
	imports: [
		ConfigurationModule,
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => {
				return {
					//TODO: replace this by configService later
					secret: process.env.JWT_SECRET,
					signOptions: {
						expiresIn: '100d',
					},
				}
			},
		}),
		MongooseModule.forFeature([
			{ name: UserModel.name, schema: UserSchema },
		]),
	],
	exports: [UserService],
	providers: [UserService],
})
export class DAOModule { }
