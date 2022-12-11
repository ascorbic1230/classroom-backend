import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class PresentationDto {
	@IsOptional()
	@IsNotEmpty()
	name?: string;

	@IsOptional()
	@IsNotEmpty()
	description?: string;
}
