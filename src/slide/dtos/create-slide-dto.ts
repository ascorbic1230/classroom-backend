import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { SlideType } from "../../constants";

export class CreateSlideDto {

	_id?: string;

	@IsString()
	@IsNotEmpty()
	presentationId: string;

	@IsString()
	@IsOptional()
	title?: string;

	@IsString()
	@IsOptional()
	content?: string;

	@IsEnum(SlideType, { message: 'slideType must be MULTIPLE_CHOICE, HEADING or PARAGRAPH' })
	@IsOptional()
	slideType?: SlideType;

	@IsOptional()
	options?: { value: string, image: string, quantity: number }[];

	@IsOptional()
	@IsArray()
	answer?: string[];
}
