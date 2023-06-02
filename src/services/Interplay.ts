import { log } from '@videopass/services'
import { CtmsClient } from '@videopass/ctms'
import { AssetAttributes, AssetObject, Attribute, FullRegistryInfo, IdentityProviders, UserSession } from '@videopass/ctms-model'
import { VideopassTranscodedVideo, VideopassVideo } from '@videopass/model'
import { buildCtmsAuth, buildCtmsConfig } from '@videopass/ctms-core'

const prefix = 'com.avid.workgroup.Property.User.'

const getAttributes = [`${prefix}Theta DRM`, `${prefix}Theta Chain`, `${prefix}Theta Network`]

export async function getAssetByIdInInterplay(ctmsClient: CtmsClient, fullRegistry: FullRegistryInfo, userSession: UserSession, mobId: string) {
	try {
		return await ctmsClient.Asset.getAssetById(fullRegistry, mobId, getAttributes)
	} catch (error) {
		log.error(error, `getAssetByIdInInterplay ${mobId}`)
	}
}

export interface FromMediaCentralAttributes {
	drm: string
	chain: string
	network: string
}

// create function with AssetObjectResponse as parameter
// and find for each item in getAttributes the corresponding value in AssetObjectResponse._embedded['aa:attributes'].attributes
// and return an object with the values of the attributes
// and if not found return empty string
// where the property name is the attribute name without the prefix
// and map to FromMediaCentralAttributes
export function getValuesOfAttributes(asset: AssetObject) {
	const attributes = asset._embedded['aa:attributes'].attributes as Attribute[]

	const values = getAttributes.map((attribute) => {
		const value = attributes.find((attr) => attr.name === attribute)?.value || ''
		const name = attribute.replace(prefix, '').replace('Theta ', '').toLowerCase()

		return { [name]: value.toString() }
	})

	return values.reduce((acc, curr) => ({ ...acc, ...curr }), {}) as unknown as FromMediaCentralAttributes
}

export async function addMetaDataToInterplay(ctmsClient: CtmsClient, fullRegistry: FullRegistryInfo, userSession: UserSession, video: VideopassTranscodedVideo) {
	try {
		await ctmsClient.SequenceRecipes.updateSequenceMetadataByVideoId(fullRegistry, video.videoId, buildVideopassSetAttributes(video))
	} catch (error /*?*/) {
		error.message //?
		log.error(error, `addMetaDataToInterplay ${video.id}`)
	}
}

export function buildVideopassSetAttributes(video: VideopassTranscodedVideo) {
	const videopassAttributes: AssetAttributes = {
		attributes: [
			{ name: `${prefix}Theta Link`, value: video.playback_uri || '' },
			{ name: `${prefix}Theta State`, value: video.state || '' },
		],
	}

	return videopassAttributes
}
