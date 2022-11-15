export class LogHelper {
	log(message?: any, ...optionalParams: any[]): void {
		if (optionalParams && optionalParams.length) {
			console.log(message, optionalParams);
		} else {
			console.log(message);
		}
	}

	info(message?: any, ...optionalParams: any[]): void {
		if (optionalParams && optionalParams.length) {
			console.log(message, optionalParams);
		} else {
			console.log(message);
		}
	}

	error(message?: any, ...optionalParams: any[]): void {
		if (optionalParams && optionalParams.length) {
			console.error(message, optionalParams);
		} else {
			console.error(message);
		}
	}
}

export const logHelper = new LogHelper();