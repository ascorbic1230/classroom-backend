import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RoleInGroup } from "@/constants";

export type GroupDocument = GroupModel & Document;
@Schema({ timestamps: true, collection: 'groups' })

export class GroupModel {
	_id: string;

	@Prop({ type: String, default: 'New Group' })
	name: string;

	@Prop({ type: String, default: 'No Description' })
	description: string;

	@Prop()
	usersAndRoles: { userId: Types.ObjectId, role: RoleInGroup, _id: Types.ObjectId }[];

	@Prop({ type: String, default: null })
	userCreated: string;

	@Prop({ type: String, default: null })
	userUpdated: string;
}

export const GroupSchema = SchemaFactory.createForClass(GroupModel);

