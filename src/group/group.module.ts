import { MailModule } from "@/mail/mail.module";
import { UserModule } from "@/user/user.module";
import { Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from '@nestjs/mongoose';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { GroupModel, GroupSchema } from './schemas/group.schema';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: GroupModel.name, schema: GroupSchema },
		]),
		UserModule,
		MailModule,
		JwtModule.registerAsync({
			useFactory: async (configService: ConfigService) => {
				return {
					secret: configService.get('JWT_SECRET')
				}
			},
			inject: [ConfigService],
		}),
	],
	controllers: [GroupController],
	providers: [GroupService],
})
export class GroupModule { }