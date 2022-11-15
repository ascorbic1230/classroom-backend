import { UserModule } from "@/user/user.module";
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { GroupModel, GroupSchema } from './schemas/group.schema';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: GroupModel.name, schema: GroupSchema },
		]),
		UserModule
	],
	controllers: [GroupController],
	providers: [GroupService],
})
export class GroupModule { }