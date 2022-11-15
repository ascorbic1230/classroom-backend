import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GroupDocument = GroupModel & Document;
@Schema({ timestamps: true, collection: 'groups' })

export class GroupModel {
	_id: string;

	@Prop({ type: String, default: 'New Group' })
	displayName: string;

	@Prop({ type: Array, required: true })
	users: string[];
}

export const GroupSchema = SchemaFactory.createForClass(GroupModel);

