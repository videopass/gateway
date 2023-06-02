import * as chokidar from 'chokidar'
import { buildConfig } from './builders/ConfigBuilder'
import { CollectionNames, log } from '@videopass/services'
import { FirestoreDb } from '@videopass/firebase'
import { buildVideoFtp, getFileName } from './helpers/BuildInfo'
import fs from 'fs-extra'
import { FileState } from '@videopass/model'

const CONFIG = buildConfig()
const WATCH_FOLDER = CONFIG.appConfig.ftpFolder
const TRANSCODE_FOLDER = CONFIG.appConfig.transcodeFolder

const config: chokidar.WatchOptions = {
	ignored: [/^\./, '*.avp'],
	persistent: true,
	depth: 0,
	usePolling: true,
	alwaysStat: true,
	interval: 1000,
	binaryInterval: 1000,
	// holding its add and change events until the size does not change for a configurable amount of time.
	awaitWriteFinish: {
		stabilityThreshold: 2000,
		pollInterval: 100,
	},
}

export async function InitFtpWatcher(db: FirestoreDb) {
	const watcher = chokidar.watch(`${WATCH_FOLDER}/**`, config)
	log.info(`start monitor folder ${WATCH_FOLDER}`)

	watcher
		.on('ready', () => {
			log.info(`ready for scan files`)
		})
		// add after file is completely written
		.on('add', async (path) => {
			try {
				log.debug(`new file found ${path}`)

				const video = await buildVideoFtp(path)
				video.progress = 100
				video.state = FileState.Downloaded
				await db.update(CollectionNames.files, video)
				await moveFile(path)
			} catch (error) {
				log.error(error, `error on insert file ${path}`)
			}
		})
		.on('error', (error) => {
			log.error(error, 'file watcher')
		})
}

// function to move file to transcode folder
async function moveFile(path: string) {
	try {
		const fileName = getFileName(path)
		const transcodePath = `${TRANSCODE_FOLDER}/${fileName}.mxf`
		await fs.move(path, transcodePath)
	} catch (error) {
		log.error(error, `move file ${path}`)
	}
}
