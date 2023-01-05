import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { RoomType } from "src/constants";

export class CreateRoomDto {
	@IsNotEmpty()
	@IsString()
	presentationId: string;

	@IsOptional()
	@IsEnum(RoomType)
	roomType: RoomType = RoomType.PUBLIC;

	@IsOptional()
	@IsString()
	groupId?: string;
}
