import { IsNumber, IsOptional } from "class-validator";

export class GetChatDto {
	@IsOptional()
	size: number;

	@IsOptional()
	offset: number;
}