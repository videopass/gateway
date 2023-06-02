import { CollectionNames, log } from '@videopass/services'
import { HandbrakeProgress } from 'handbrake-js'
import { spawn, HandbrakeOptions } from 'handbrake-js'
import { buildVideoTranscoded } from '../helpers/BuildInfo'
import { FirestoreDb } from '@videopass/firebase'
import { FileState } from '@videopass/model'

export async function Transcode(option: HandbrakeOptions, db: FirestoreDb) {
	if (!option.input) throw new Error('input file is required')
	let video = await buildVideoTranscoded(option.input)
	try {
		await db.insert(CollectionNames.files, video)
	} catch (error) {
		log.error(error, `error on insert file ${option.input}`)
	}
	const handbrake = spawn(option)

	handbrake.on('progress', async (progress: HandbrakeProgress) => {
		try {
			// check if difference is more than 5% to avoid update db too much
			if (progress.percentComplete !== 100 && progress.percentComplete - video.progress < 5) return

			const progressVideo = { ...video, progress: progress.percentComplete }
			video = progressVideo
			log.info(`Percent complete: ${progressVideo.progress} ${progressVideo.name} `)
			await db.updateFields(CollectionNames.files, progressVideo.id, 'progress', Number(progressVideo.progress), 'update_time', new Date().toISOString())
		} catch (error) {
			log.error(error, `update transcode progress ${video.name}`)
		}
	})

	handbrake.on('error', async (err: Error) => {
		try {
			log.info(`Transcoding error ${video.name} ${err.message}}`)
			await db.updateFields(CollectionNames.files, video.id, 'error', err.message, 'update_time', new Date().toISOString())
		} catch (error) {
			log.error(error, `update transcoding error ${video.name}`)
		}
	})

	handbrake.on('complete', async () => {
		try {
			log.info(`Transcoding complete ${video.name}`)
			await db.updateFields(CollectionNames.files, video.id, 'state', FileState.Transcoding.toString(), 'update_time', new Date().toISOString())
		} catch (error) {
			log.error(error, `update transcoding complete ${video.name}`)
		}
	})
}
