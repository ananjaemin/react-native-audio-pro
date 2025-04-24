import { Image } from 'react-native';

import { emitter, NativeAudioPro } from './emitter';
import { useInternalStore } from './useInternalStore';
import { guardTrackPlaying, logDebug, validateTrack } from './utils';
import { AudioProEventType, AudioProState, DEFAULT_CONFIG, DEFAULT_SEEK_MS } from './values';

import type {
	AudioProConfigureOptions,
	AudioProEventCallback,
	AudioProPlayOptions,
	AudioProTrack,
} from './types';

function isValidPlayerStateForOperation(operation: string): boolean {
	const { playerState } = useInternalStore.getState();
	if (playerState === AudioProState.IDLE || playerState === AudioProState.ERROR) {
		logDebug(`AudioPro: ${operation} ignored - player in`, playerState, 'state');
		return false;
	}
	return true;
}

export const AudioPro = {
	configure(options: AudioProConfigureOptions): void {
		const { setConfigureOptions, setDebug, setDebugIncludesProgress } =
			useInternalStore.getState();
		setConfigureOptions({ ...DEFAULT_CONFIG, ...options });
		setDebug(!!options.debug);
		setDebugIncludesProgress(options.debugIncludesProgress ?? false);
		logDebug('AudioPro: configure()', options);
	},

	clear() {
		logDebug('AudioPro: clear()');
		const { error, setError, setTrackPlaying } = useInternalStore.getState();
		if (error) {
			setError(null);
		}
		setTrackPlaying(null);
		NativeAudioPro.clear();
	},

	play(track: AudioProTrack, options?: AudioProPlayOptions) {
		const playOptions: AudioProPlayOptions = options || {};
		logDebug('AudioPro: play()', track, 'options:', options);

		const resolvedTrack = { ...track };

		// Resolve artwork if it's a number
		if (typeof track.artwork === 'number') {
			resolvedTrack.artwork = Image.resolveAssetSource(track.artwork).uri;
			logDebug('AudioPro: Resolved require() artwork to URI', resolvedTrack.artwork);
		}

		// Resolve URL if it's a number
		if (typeof track.url === 'number') {
			resolvedTrack.url = Image.resolveAssetSource(track.url).uri;
			logDebug('AudioPro: Resolved require() audio URL to URI', resolvedTrack.url);
		}

		if (!validateTrack(resolvedTrack)) {
			const errorMessage = 'AudioPro: Invalid track provided to play().';
			console.error(errorMessage);
			emitter.emit('AudioProEvent', {
				type: AudioProEventType.PLAYBACK_ERROR,
				track: null,
				payload: {
					error: errorMessage,
					errorCode: -1,
				},
			});
			return;
		}

		// Clear errors and set track as playing
		const { error, setError, configureOptions, playbackSpeed, setTrackPlaying } =
			useInternalStore.getState();
		setTrackPlaying(resolvedTrack);
		if (error) {
			setError(null);
		}

		// Prepare options for native module
		const nativeOptions = {
			...configureOptions,
			playbackSpeed,
			autoplay: playOptions.autoPlay ?? true,
			headers: playOptions.headers,
		};

		NativeAudioPro.play(resolvedTrack, nativeOptions);
	},

	pause() {
		if (!guardTrackPlaying('pause')) return;
		logDebug('AudioPro: pause()');
		if (!isValidPlayerStateForOperation('pause()')) return;
		NativeAudioPro.pause();
	},

	resume() {
		if (!guardTrackPlaying('resume')) return;
		logDebug('AudioPro: resume()');
		if (!isValidPlayerStateForOperation('resume()')) return;

		// Clear any existing error
		const { error, setError } = useInternalStore.getState();
		if (error) {
			setError(null);
		}
		NativeAudioPro.resume();
	},

	stop() {
		logDebug('AudioPro: stop()');
		const { error, setError } = useInternalStore.getState();
		if (error) {
			setError(null);
		}
		NativeAudioPro.stop();
	},

	seekTo(positionMs: number) {
		if (!guardTrackPlaying('seekTo')) return;
		logDebug('AudioPro: seekTo()', positionMs);
		if (!isValidPlayerStateForOperation('seekTo()')) return;
		NativeAudioPro.seekTo(positionMs);
	},

	seekForward(amountMs: number = DEFAULT_SEEK_MS) {
		if (!guardTrackPlaying('seekForward')) return;
		logDebug('AudioPro: seekForward()', amountMs);
		if (!isValidPlayerStateForOperation('seekForward()')) return;
		NativeAudioPro.seekForward(amountMs);
	},

	seekBack(amountMs: number = DEFAULT_SEEK_MS) {
		if (!guardTrackPlaying('seekBack')) return;
		logDebug('AudioPro: seekBack()', amountMs);
		if (!isValidPlayerStateForOperation('seekBack()')) return;
		NativeAudioPro.seekBack(amountMs);
	},

	addEventListener(callback: AudioProEventCallback) {
		return emitter.addListener('AudioProEvent', callback);
	},

	getTimings() {
		const { position, duration } = useInternalStore.getState();
		return { position, duration };
	},

	getState() {
		return useInternalStore.getState().playerState;
	},

	getPlayingTrack() {
		return useInternalStore.getState().trackPlaying;
	},

	setPlaybackSpeed(speed: number) {
		const validatedSpeed = Math.max(0.25, Math.min(2.0, speed));
		if (validatedSpeed !== speed) {
			console.warn(
				`AudioPro: Playback speed ${speed} out of range, clamped to ${validatedSpeed}`,
			);
		}

		logDebug('AudioPro: setPlaybackSpeed()', validatedSpeed);
		const { setPlaybackSpeed, trackPlaying } = useInternalStore.getState();
		setPlaybackSpeed(validatedSpeed);

		if (trackPlaying) {
			if (!isValidPlayerStateForOperation('setPlaybackSpeed() native call')) return;
			NativeAudioPro.setPlaybackSpeed(validatedSpeed);
		}
	},

	getPlaybackSpeed() {
		return useInternalStore.getState().playbackSpeed;
	},

	getError() {
		return useInternalStore.getState().error;
	},
};
