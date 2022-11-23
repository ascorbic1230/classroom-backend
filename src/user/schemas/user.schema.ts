import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

	@Prop({ type: String })
	avatarUrl: string;

	@Prop({ type: Boolean, default: false })
	isLoggedInWithGoogle: boolean;

	@Prop({ type: String })
	description: string;

	@Prop({ type: Boolean, default: false })
	isEmailVerified: boolean;

	@Prop({ type: [Types.ObjectId], ref: 'groups' })
	groups: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(UserModel);

