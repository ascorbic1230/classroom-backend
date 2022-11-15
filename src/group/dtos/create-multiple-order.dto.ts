// import { IsEnum, IsNotEmpty, IsString, IsOptional, IsDate, ValidateNested, IsArray } from 'class-validator';
// import { AddressDetailDto } from "@/address/dtos/address-detail.dto";
// import { OrderStatus } from "src/constants";
// import { Type } from 'class-transformer';
// import { MerchandiseDto } from "src/merchandise/dtos/merchandise.dto";

// export class CreateMultipleOrderDto {

// 	@IsOptional()
// 	@IsString()
// 	userId: string;

// 	@IsOptional()
// 	@IsString()
// 	ownerMobile: string;

// 	@IsArray()
// 	listMerchandise: MerchandiseDto[];

// 	@IsNotEmpty()
// 	@Type(() => AddressDetailDto)
// 	@ValidateNested({ each: true })
// 	receiverAddress: AddressDetailDto;

// 	@IsOptional()
// 	@IsEnum(OrderStatus)
// 	status: OrderStatus;

// 	@IsOptional()
// 	@IsDate()
// 	deliveryDate: Date;

// 	@IsOptional()
// 	@IsString()
// 	note: string;

// 	@IsOptional()
// 	@IsDate()
// 	submitDate: Date;
// }