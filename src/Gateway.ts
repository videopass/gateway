import { CtmsClient } from '@videopass/ctms'
import { buildCtmsUrl, buildCtmsAuth, buildCtmsConfig } from '@videopass/ctms-core'
import { Firebase, FirestoreDb } from '@videopass/firebase'
import { InitFtpMonitor } from './FtpMonitor'
import { InitFtpWatcher } from './FtpWatcher'
import { InitTranscodeWatcher } from './TranscodeWatcher'
import { InitUploadWatcher } from './UploadWatcher'

async function start() {
	try {
		const fb = new Firebase()
		const db = new FirestoreDb(fb.app)

		const ctmsClient = await CtmsClient.Init(buildCtmsUrl(), buildCtmsAuth(), buildCtmsConfig())

		await InitFtpMonitor(db, ctmsClient)
		await InitFtpWatcher(db)
		await InitTranscodeWatcher(db)
		await InitUploadWatcher(db, ctmsClient)
	} catch (error) {
		console.error(error)
	}
}

start()
