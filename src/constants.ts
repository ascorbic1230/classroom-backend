export enum RoleInGroup {
	OWNER = 'OWNER',
	CO_OWNER = 'CO_OWNER',
	MEMBER = 'MEMBER',
}

export enum SlideType {
	MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
	HEADING = 'HEADING',
	PARAGRAPH = 'PARAGRAPH',
}

export enum RoomType {
	GROUP = 'GROUP',
	PUBLIC = 'PUBLIC',
}

export const REDIS_EXPIRE_TIME = 60 * 60 * 1;