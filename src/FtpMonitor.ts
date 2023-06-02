import * as chokidar from 'chokidar'
import { buildConfig } from './builders/ConfigBuilder'
import { CollectionNames, log } from '@videopass/services'
import { FirestoreDb } from '@videopass/firebase'
import { buildVideoFtp } from './helpers/BuildInfo'
import { CtmsClient } from '@videopass/ctms'

const CONFIG = buildConfig()
const WATCH_FOLDER = CONFIG.appConfig.ftpFolder

const config: chokidar.WatchOptions = {
	ignored: [/^\./, '*.avp'],
	persistent: true,
	depth: 0,
	usePolling: true,
	alwaysStat: true,
	interval: 1000,
	binaryInterval: 1000,
}

export async function InitFtpMonitor(db: FirestoreDb, ctmsClient: CtmsClient) {
	const watcher = chokidar.watch(`${WATCH_FOLDER}/**`, config)
	log.info(`start monitor folder ${WATCH_FOLDER}`)

	watcher
		.on('ready', () => {
			log.info(`ready for scan files`)
		})
		// add after start written file
		.on('add', async (path) => {
			try {
				log.debug(`new file found ${path}`)

				const video = await buildVideoFtp(path)
				await db.insert(CollectionNames.files, video)
			} catch (error) {
				log.error(error, `error on insert file ${path}`)
			}
		})
		.on('change', async (path) => {
			const video = await buildVideoFtp(path)
			log.debug(`file changed ${video.id} ${video.progress}`)
			await db.updateFields(CollectionNames.files, video.id, 'progress', video.progress, 'update_time', new Date().toISOString())
		})
		.on('error', (error) => {
			log.error(error, 'file watcher')
		})
}
