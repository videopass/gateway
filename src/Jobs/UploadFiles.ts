import { VideoApi, log } from '@videopass/services'
import { buildConfig } from '../builders/ConfigBuilder'
import fs from 'fs-extra'
import { VideoBody } from '@videopass/model'

const CONFIG = buildConfig()
const VIDEO_API_CONFIG = CONFIG.videoApiConfig
const videoApi = new VideoApi(VIDEO_API_CONFIG.apiKey, VIDEO_API_CONFIG.apiSecret)

export async function uploadFileAndTranscode(path: string, drm: string): Promise<VideoBody> {
	log.debug(`upload ${path}`)
	try {
		const uploadBody = await videoApi.createPreSignedURL()
		const buffer = await fs.readFile(path)

		const upload = uploadBody.uploads[0]
		await videoApi.uploadFileServerToServer(buffer, upload)

		return await videoApi.transcodeVideo({ playback_policy: 'public', source_upload_id: upload.id, nft_collection: drm })
	} catch (error) {
		log.error(error, `upload file ${path}`)
		throw error
	}
}
