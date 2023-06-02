import { log } from '@videopass/services'
import { AppConfig } from '../interfaces'
import { Config } from '../interfaces/Config'
import { VideoApiConfig } from '@videopass/model'

export function buildConfig(): Config {
	const message = `Build config`

	try {
		const appConfig: AppConfig = {
			logLevel: process.env.LOG_LEVEL || 'debug',
			runMode: process.env.MODE || 'development',
			ftpFolder: process.env.FTP_FOLDER || '/ftp',
			transcodeFolder: process.env.TRANSCODE_FOLDER || '/transcode',
			uploadFolder: process.env.UPLOAD_FOLDER || '/upload',
		}

		log.info(appConfig)

		const videoApiConfig: VideoApiConfig = {
			apiKey: process.env.REACT_APP_VIDEO_API_KEY || '',
			apiSecret: process.env.REACT_APP_VIDEO_API_SECRET || '',
			partnerId: process.env.REACT_APP_VIDEO_PARTNER_ID || '',
			partnerApiKey: process.env.REACT_APP_VIDEO_PARTNER_API_KEY || '',
			partnerApiSecret: process.env.REACT_APP_VIDEO_PARTNER_API_SECRET || '',
		}

		log.info(videoApiConfig)

		return { videoApiConfig, appConfig }
	} catch (error) {
		log.error(error, message)
		throw error
	}
}
