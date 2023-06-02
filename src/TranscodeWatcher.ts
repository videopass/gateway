import * as chokidar from 'chokidar'
import { buildConfig } from './builders/ConfigBuilder'
import { log } from '@videopass/services'
import fs from 'fs-extra'
import { FirestoreDb } from '@videopass/firebase'
import { Transcode } from './Jobs/TranscodeFiles'
import { getFileName } from './helpers/BuildInfo'

const CONFIG = buildConfig()
const TRANSCODE_FOLDER = CONFIG.appConfig.transcodeFolder
const UPLOAD_FOLDER = CONFIG.appConfig.uploadFolder

// watch for ftp files
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

export async function InitTranscodeWatcher(db: FirestoreDb) {
	const watcher = chokidar.watch(`${TRANSCODE_FOLDER}/**`, config)
	log.info(`start watching folder ${TRANSCODE_FOLDER}`)

	watcher
		.on('ready', () => {
			log.info(`ready for scan files`)
		})
		.on('add', async (path) => {
			log.debug(`new file found ${path}`)
			try {
				const fileName = getFileName(path)
				// make path with fileName and upload folder
				const uploadPath = `${UPLOAD_FOLDER}/${fileName}.mp4`
				const handbrakeOptions = { input: path, output: uploadPath }
				await Transcode(handbrakeOptions, db)
			} catch (error) {
				log.error(error, `transcode file ${path}`)
			}
		})
		.on('change', (path) => {
			log.debug(`file updated ${path}`)
		})
		.on('error', (error) => {
			log.error(error, 'file watcher')
		})
}

