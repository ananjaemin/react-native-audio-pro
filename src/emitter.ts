import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

import { useInternalStore } from './useInternalStore';
import { logDebug } from './utils';
import { AudioProEventType } from './values';
import { WebAudioPro } from './web';

import type { AudioProEvent } from './types';

export const NativeAudioPro = Platform.OS === 'web' ? WebAudioPro : NativeModules.AudioPro;
export const emitter = new NativeEventEmitter(NativeAudioPro);

emitter.addListener('AudioProEvent', (event: AudioProEvent) => {
	const { debug, debugIncludesProgress, updateFromEvent } = useInternalStore.getState();
	if (debug) {
		if (event.type === AudioProEventType.PROGRESS && !debugIncludesProgress) {
			return;
		}
		logDebug('AudioProEvent', JSON.stringify(event));
	}
	updateFromEvent(event);
});
