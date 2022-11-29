import { IsString, IsNotEmpty, IsEmail, IsEnum, IsNotIn, IsMongoId, Matches } from 'class-validator';
import { RoleInGroup } from "../../constants";

export class AssignRoleDto {
	@IsString()
	@IsNotEmpty()
	@IsMongoId()
	user: string;

	@IsEnum(RoleInGroup, { message: 'Role must be CO_OWNER or MEMBER' })
	@IsNotIn([RoleInGroup.OWNER], { message: 'A group can only have one OWNER' })
	@IsNotEmpty()
	role: RoleInGroup;
}
