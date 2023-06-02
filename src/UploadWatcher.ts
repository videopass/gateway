import * as chokidar from 'chokidar'
import { buildConfig } from './builders/ConfigBuilder'
import { CollectionNames, log } from '@videopass/services'
import { uploadFileAndTranscode } from './Jobs/UploadFiles'
import { FirestoreDb } from '@videopass/firebase'
import { FileState, VideopassVideo } from '@videopass/model'
import { buildVideoTranscoded, getFileName, getFileNameBeforeUnderscore, getMobId } from './helpers/BuildInfo'
import { moveFilesToEdgeStore } from './Jobs/MoveFilesToEdgeStore'
import { unlink } from 'fs-extra'
import { CtmsClient, getAssetById } from '@videopass/ctms'
import { buildCtmsAuth, buildCtmsConfig } from '@videopass/ctms-core'
import { addMetaDataToInterplay, getAssetByIdInInterplay, getValuesOfAttributes } from './services/Interplay'

const CONFIG = buildConfig()
const WATCH_FOLDER = CONFIG.appConfig.uploadFolder
const TRANSCODE_FOLDER = CONFIG.appConfig.transcodeFolder

const config: chokidar.WatchOptions = {
	ignored: [/^\./, '*.avp'],
	persistent: true,
	depth: 0,
	usePolling: true,
	// holding its add and change events until the size does not change for a configurable amount of time.
	awaitWriteFinish: {
		stabilityThreshold: 2000,
		pollInterval: 100,
	},
}

export async function InitUploadWatcher(db: FirestoreDb, ctmsClient: CtmsClient) {
	const watcher = chokidar.watch(`${WATCH_FOLDER}/**`, config)
	log.info(`start watching folder ${WATCH_FOLDER}`)

	watcher
		.on('ready', () => {
			log.info(`ready for scan files`)
		})
		.on('add', async (path) => {
			log.debug(`new file found ${path}`)
			try {
				// clean up file in transcode folder
				const fileName = getFileName(path)
				await cleanupFile(`${TRANSCODE_FOLDER}/${fileName}.mxf`)

				// get metadata from Avid Media Central
				const mobId = getMobId(path) || ''

				const userSession = await ctmsClient.Authentication.authorize(ctmsClient.Cache.Identity, buildCtmsAuth(), buildCtmsConfig())
				const asset = await getAssetByIdInInterplay(ctmsClient, ctmsClient.Cache.Full, userSession, mobId)
				const attributes = getValuesOfAttributes(asset)
				const drm = attributes.drm

				const videoBody = await uploadFileAndTranscode(path, drm)
				const videopassVideo = videoBody.videos[0] as VideopassVideo
				videopassVideo.thetaId = videopassVideo.id
				videopassVideo.id = mobId
				videopassVideo.name = getFileNameBeforeUnderscore(path) || ''
				videopassVideo.chain = videopassVideo.network
				videopassVideo.drm = attributes.drm
				videopassVideo.chain = attributes.chain
				videopassVideo.network = attributes.network

				await db.update(CollectionNames.files, videopassVideo)

				const edgeStoreFile = await moveFilesToEdgeStore(path, videopassVideo)
				await db.updateField(CollectionNames.files, videopassVideo.id, 'edgeStoreFile', edgeStoreFile)

				// set metadata to Avid Media Central
				await addMetaDataToInterplay(ctmsClient, ctmsClient.Cache.Full, userSession, videopassVideo)

				if (edgeStoreFile?.success) await cleanupFile(path)
			} catch (error) {
				log.error(error, `upload file ${path}`)
				const uploadVideo = await buildVideoTranscoded(path)
				uploadVideo.error = (error as Error).message
				uploadVideo.progress = 0
				uploadVideo.state = FileState.Uploading
				await db.update(CollectionNames.files, uploadVideo)
			}
		})
		.on('change', (path) => {
			log.debug(`file updated ${path}`)
		})
		.on('error', (error) => {
			log.error(error, 'file watcher')
		})
}

async function cleanupFile(path: string) {
	try {
		await unlink(path)
	} catch (error) {
		log.error(error, `clean up file ${path}`)
	}
}
