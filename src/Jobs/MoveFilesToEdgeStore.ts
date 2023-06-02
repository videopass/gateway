import { log, putFile } from '@videopass/services'
import { VideopassVideo } from '@videopass/model'

export async function moveFilesToEdgeStore(path: string, video: VideopassVideo) {
	try {
		// todo: path or name
		const srcHost = buildHostPath(video.name)
		const edgeStoreFile = await putFile(srcHost)
		return edgeStoreFile
	} catch (error) {
		log.error(error, `moveNewFiles ${path}`)
	}
}

function buildHostPath(file: string) {
	return `/uploads/${file}`
}
