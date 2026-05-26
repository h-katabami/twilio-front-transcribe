/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly DEPLOY_AWS_PROFILE?: string;
	readonly FRONT_AUTH_USER_POOL_ID: string;
	readonly FRONT_AUTH_USER_POOL_WEB_CLIENT_ID: string;
	readonly FRONT_DOMAIN: string;
	readonly FRONT_PATH: string;
	readonly FRONT_CLOUDFRONT_DISTRIBUTION_ID?: string;
	readonly API_COMMON_PATH: string;
	readonly API_PROXY_PATH: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
