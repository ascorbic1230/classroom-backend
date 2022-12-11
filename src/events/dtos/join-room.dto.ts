import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class JoinRoomDto {
	@IsString()
	@IsNotEmpty()
	@Matches(/^[0-9]{8}$/, { message: 'Room ID must be 8 digits' })
	roomId: string;
}