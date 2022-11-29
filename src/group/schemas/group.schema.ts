import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RoleInGroup } from "../../constants";

export type GroupDocument = GroupModel & Document;
@Schema({ timestamps: true, collection: 'groups' })

export class GroupModel {
	_id: string;

	@Prop({ type: String, default: 'New Group' })
	name: string;

	@Prop({ type: String, default: 'No Description' })
	description: string;

	@Prop({ type: [{ user: { type: Types.ObjectId, ref: 'users' }, role: { type: String }, _id: false }] })
	usersAndRoles: { user: Types.ObjectId, role: RoleInGroup }[];

	@Prop({ type: Types.ObjectId, ref: 'users' })
	userCreated: { type: Types.ObjectId, ref: 'users' };

	@Prop({ type: Types.ObjectId, ref: 'users' })
	userUpdated: { type: Types.ObjectId, ref: 'users' };
}

export const GroupSchema = SchemaFactory.createForClass(GroupModel);

