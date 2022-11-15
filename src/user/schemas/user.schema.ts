import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
	displayName: string;

	@Prop({ type: String, required: true })
	password: string;

	@Prop({ type: Boolean, default: false })
	isEmailVerified: boolean;

	@Prop({ type: [String], default: [] })
	groups: string[];
}

export const UserSchema = SchemaFactory.createForClass(UserModel);

