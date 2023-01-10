import { MailModule } from "../mail/mail.module";
import { UserModule } from "../user/user.module";
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { GroupModel, GroupSchema } from './schemas/group.schema';
import { RedisModule } from "src/redis/redis.module";

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: GroupModel.name, schema: GroupSchema },
		]),
		UserModule,
		MailModule,
		RedisModule
	],
	controllers: [GroupController],
	providers: [GroupService],
	exports: [GroupService],
})
export class GroupModule { }