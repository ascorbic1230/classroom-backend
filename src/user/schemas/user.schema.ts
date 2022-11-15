import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GroupModel } from '@/group/schemas/group.schema';

export type UserDocument = UserModel & Document;
@Schema({
	timestamps: true,
	collection: 'users',
})

export class UserModel {
	_id: string;

	@Prop({ type: String, required: true })
	email: string;

	@Prop({ type: String, default: 'No Name' })
	name: string;

	@Prop({ type: String, required: true })
	password: string;

	@Prop({ type: Boolean, default: false })
	isEmailVerified: boolean;

	@Prop({ type: [Types.ObjectId], ref: GroupModel.name })
	groups: GroupModel[];
}

export const UserSchema = SchemaFactory.createForClass(UserModel);

