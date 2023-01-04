import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SlideType } from "../../constants";

export type SlideDocument = SlideModel & Document;
@Schema({ timestamps: true, collection: 'slides' })

export class SlideModel {
	_id: string;

	@Prop({ type: String, default: 'New Slide' })
	title: string;

	@Prop({ type: String, default: '' })
	content: string;

	@Prop({ type: String, default: SlideType.MULTIPLE_CHOICE })
	slideType: SlideType;

	//options (array of object {value: string, image: string})
	@Prop({ type: [{ value: String, image: String, quantity: Number, _id: false }], default: [] })
	options: { value: string, image: string, quantity: number }[];

	@Prop({ type: Types.ObjectId, ref: 'presentations' })
	presentationId: { type: Types.ObjectId, ref: 'presentations' };

	@Prop({ type: Types.ObjectId, ref: 'users' })
	userCreated: { type: Types.ObjectId, ref: 'users' };

	@Prop({ type: Types.ObjectId, ref: 'users' })
	userUpdated: { type: Types.ObjectId, ref: 'users' };
}

export const SlideSchema = SchemaFactory.createForClass(SlideModel);

