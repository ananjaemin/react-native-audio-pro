/**
 * REACT NATIVE AUDIO PRO - Web Implementation
 */

export { AudioPro } from './audioPro';
export { useAudioPro } from './useAudioPro';

export type {
	AudioProTrack,
	AudioProEventCallback,
	AudioProEvent,
	AudioProStateChangedPayload,
	AudioProTrackEndedPayload,
	AudioProPlaybackErrorPayload,
	AudioProProgressPayload,
	AudioProSeekCompletePayload,
	AudioProPlaybackSpeedChangedPayload,
} from './types';

export { AudioProState, AudioProEventType, AudioProContentType } from './values';
