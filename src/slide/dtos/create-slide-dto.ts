import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { SlideType } from "../../constants";

export class CreateSlideDto {
	@IsString()
	@IsNotEmpty()
	presentationId: string;

	@IsString()
	@IsOptional()
	title: string;

	@IsEnum(SlideType)
	@IsOptional()
	slideType: SlideType;

	@IsOptional()
	options: { value: string, image: string }[];

	@IsOptional()
	answer: string;
}
