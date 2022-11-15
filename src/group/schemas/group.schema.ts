import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GroupDocument = GroupModel & Document;
@Schema({ timestamps: true, collection: 'groups' })

export class GroupModel {
	_id: string;

	@Prop({ type: String, default: 'New Group' })
	name: string;

	@Prop({ type: String, default: 'No Description' })
	description: string;

	@Prop({ type: Array, required: true })
	users: string[];

	@Prop({ type: String, default: null })
	userCreated: string;

	@Prop({ type: String, default: null })
	userUpdated: string;
}

export const GroupSchema = SchemaFactory.createForClass(GroupModel);

