import * as Joi from 'joi';
export const schema = {
	// App config
	NODE_ENV: Joi.string().default('development'),
	APP_NAME: Joi.string().default('common_nest_project'),
	PORT: Joi.number().default(3000),
	API_LOGGER: Joi.string().default('true'),

	// MongoDB config
	MONGODB_URI: Joi.string().required(),

	// JWT config
	JWT_SECRET: Joi.string().required(),

	//REDIS
	REDIS_HOST: Joi.string().required(),
	REDIS_PORT: Joi.number().required(),
	REDIS_USERNAME: Joi.string().required(),
	REDIS_PASSWORD: Joi.string().required(),
};

export type ConfigSchema = {
	[k in keyof typeof schema]: string;
};


export const configuration = () => {
	return Object.keys(schema).reduce((result, value) => {
		result[value] = process.env[value];
		return result;
	}, {});
};

export const validationSchema = Joi.object(schema);