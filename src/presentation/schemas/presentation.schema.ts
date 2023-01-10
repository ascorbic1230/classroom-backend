import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PresentationDocument = PresentationModel & Document;
@Schema({ timestamps: true, collection: 'presentations' })

export class PresentationModel {
	_id: string;

	@Prop({ type: String, default: 'New Presentation' })
	name: string;

	@Prop({ type: String, default: 'No Description' })
	description: string;

	@Prop({ type: [Types.ObjectId], ref: 'users' })
	collaborators: Types.ObjectId[];

	@Prop({ type: [{ type: Types.ObjectId, ref: 'slides' }] })
	slides: { type: Types.ObjectId, ref: 'slides' }[];

	@Prop({ type: Types.ObjectId, ref: 'users' })
	userCreated: { type: Types.ObjectId, ref: 'users' };

	@Prop({ type: Types.ObjectId, ref: 'users' })
	userUpdated: { type: Types.ObjectId, ref: 'users' };
}

export const PresentationSchema = SchemaFactory.createForClass(PresentationModel);

