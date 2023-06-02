import { VideopassFtp, FileState, VideopassTranscode } from '@videopass/model'
import { log } from '@videopass/services'
import fs from 'fs-extra'

export async function buildVideoFtp(path: string) {
	const size = (await getFileSize(path)) || 0
	const duration = getDuration(path) || 0
	const progress = getProgress(size, duration) || 0
	const fileName = getFileName(path) || '_'
	const cleanFileName = getFileNameBeforeUnderscore(fileName)

	const ftp: VideopassFtp = {
		id: getMobId(path) || '',
		name: cleanFileName || '',
		state: FileState.Downloading,
		size: size,
		progress: progress,
		duration: duration,
		create_time: new Date().toISOString(),
		update_time: new Date().toISOString(),
		error: '',
	}

	log.debug(`file: ${ftp.name} progress: ${progress} duration ${duration} size ${size} state: ${ftp.state}`)
	return ftp
}

export async function buildVideoTranscoded(path: string, progress: number = 0) {
	const fileName = getFileName(path) || '_'
	const cleanFileName = getFileNameBeforeUnderscore(fileName)

	const transcode: VideopassTranscode = {
		id: getMobId(path) || '',
		name: cleanFileName || '',
		state: FileState.Transcoding,
		progress: progress,
		create_time: new Date().toISOString(),
		update_time: new Date().toISOString(),
		error: '',
	}

	log.debug(`file: ${transcode.name} progress: ${progress} state: ${transcode.state}`)
	return transcode
}

// create function which get file name of getFileName and before _
export function getFileNameBeforeUnderscore(fileName: string) {
	try {
		const name = fileName.split('_')[0]
		return name
	} catch (error) {
		log.error(error, `get file name before underscore ${fileName}`)
	}
}

export function getFileName(path: string) {
	try {
		// get operating system
		const os = process.platform
		// if windows
		if (os === 'win32' || path.includes('\\')) {
			// get file name from Windows path
			const name = path.split('\\').pop()?.split('.').shift() || ''
			return name
		}
		// if linux
		// get file name from Linux path without extension
		const name = path.split('/').pop()?.split('.').shift() || ''
		return name
	} catch (error) {
		log.error(error, `get file name ${path}`)
	}
}

// create function which get mobid from name after 2nd _ and before .
export function getMobId(name: string) {
	try {
		const mobId = name.split('_')[2].split('.')[0]
		return mobId
	} catch (error) {
		log.error(error, `get mobid ${name}`)
	}
}

// create function which get file duration from name after _ and before _
export function getDuration(name: string) {
	try {
		const duration = name.split('_')[1]
		return Number(duration)
	} catch (error) {
		log.error(error, `get duration ${name}`)
	}
}

// create function which get file current size from getFileSize
// and calculate xdcam50SizePerSecond time duration
// and calculate progress based current size

export function getProgress(size: number, duration: number) {
	try {
		const calculatedSize = xdcam50SizePerSecond * duration //?
		let progress = (size / calculatedSize) * 100
		// round to 2 decimals
		progress = Math.round((size / calculatedSize) * 100 * 100) / 100
		return Number(progress)
	} catch (error) {
		log.error(error, `get progress ${size} ${duration}`)
	}
}

// create function which get file size
export async function getFileSize(path: string) {
	try {
		const stats = await fs.stat(path)
		return stats.size
	} catch (error) {
		log.error(error, `get file size ${path}`)
	}
}

export const xdcam50SizePerSecond = 2298426.4
// 500/60 =
