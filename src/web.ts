import { emitter } from './emitter';
import { AudioProEventType, AudioProState } from './values';

import type { AudioProPlayOptions, AudioProTrack } from './types';

export interface WebAudioProInterface {
	play(track: AudioProTrack, options: AudioProPlayOptions): void;
	pause(): void;
	resume(): void;
	stop(): void;
	seekTo(positionMs: number): void;
	seekForward(amountMs: number): void;
	seekBack(amountMs: number): void;
	setPlaybackSpeed(speed: number): void;
}

class WebAudioProImpl implements WebAudioProInterface {
	private audio: HTMLAudioElement | null = null;
	private currentTrack: AudioProTrack | null = null;
	private progressInterval: number | null = null;
	private playbackSpeed: number = 1.0;
	private debug: boolean = false;

	constructor() {
		if (typeof window !== 'undefined' && typeof document !== 'undefined') {
			this.audio = new Audio();
			this.setupAudioListeners();
		}
	}

	private log(...args: unknown[]): void {
		if (this.debug) {
			console.log('~~~ [Web]', ...args);
		}
	}

	private setupAudioListeners(): void {
		if (!this.audio) return;

		this.audio.addEventListener('playing', () => {
			this.emitStateChanged(AudioProState.PLAYING);
			this.startProgressUpdates();
		});

		this.audio.addEventListener('pause', () => {
			this.emitStateChanged(AudioProState.PAUSED);
			this.stopProgressUpdates();
		});

		this.audio.addEventListener('ended', () => {
			this.stopProgressUpdates();
			this.emitTrackEnded();
		});

		this.audio.addEventListener('error', (e: Event) => {
			this.stopProgressUpdates();
			const audioElement = e.target as HTMLAudioElement;
			const errorMessage = audioElement.error?.message || 'Unknown error';
			const errorCode = audioElement.error?.code || -1;
			this.emitError(`Audio error: ${errorMessage}`, errorCode);
		});

		this.audio.addEventListener('loadstart', () => {
			this.emitStateChanged(AudioProState.LOADING);
		});

		this.audio.addEventListener('canplay', () => {
			if (this.audio?.paused) {
				this.emitStateChanged(AudioProState.PAUSED);
			}
		});

		this.audio.addEventListener('seeked', () => {
			this.emitSeekComplete();
		});
	}

	private emitStateChanged(state: AudioProState): void {
		const position = this.audio?.currentTime ? Math.floor(this.audio.currentTime * 1000) : 0;
		const duration =
			this.audio?.duration && !isNaN(this.audio.duration)
				? Math.floor(this.audio.duration * 1000)
				: 0;

		emitter.emit('AudioProEvent', {
			type: AudioProEventType.STATE_CHANGED,
			track: this.currentTrack,
			payload: {
				state,
				position,
				duration,
			},
		});
	}

	private emitProgress(): void {
		if (!this.audio) return;

		const position = Math.floor(this.audio.currentTime * 1000);
		const duration = !isNaN(this.audio.duration) ? Math.floor(this.audio.duration * 1000) : 0;

		emitter.emit('AudioProEvent', {
			type: AudioProEventType.PROGRESS,
			track: this.currentTrack,
			payload: {
				position,
				duration,
			},
		});
	}

	private emitTrackEnded(): void {
		if (!this.audio) return;

		const position = Math.floor(this.audio.currentTime * 1000);
		const duration = !isNaN(this.audio.duration) ? Math.floor(this.audio.duration * 1000) : 0;

		emitter.emit('AudioProEvent', {
			type: AudioProEventType.TRACK_ENDED,
			track: this.currentTrack,
			payload: {
				position,
				duration,
			},
		});
	}

	private emitSeekComplete(): void {
		if (!this.audio) return;

		const position = Math.floor(this.audio.currentTime * 1000);
		const duration = !isNaN(this.audio.duration) ? Math.floor(this.audio.duration * 1000) : 0;

		emitter.emit('AudioProEvent', {
			type: AudioProEventType.SEEK_COMPLETE,
			track: this.currentTrack,
			payload: {
				position,
				duration,
			},
		});
	}

	private emitError(error: string, errorCode: number = -1): void {
		emitter.emit('AudioProEvent', {
			type: AudioProEventType.PLAYBACK_ERROR,
			track: this.currentTrack,
			payload: {
				error,
				errorCode,
			},
		});

		emitter.emit('AudioProEvent', {
			type: AudioProEventType.STATE_CHANGED,
			track: this.currentTrack,
			payload: {
				state: AudioProState.ERROR,
				position: 0,
				duration: 0,
			},
		});
	}

	private startProgressUpdates(): void {
		this.stopProgressUpdates();
		this.progressInterval = window.setInterval(() => {
			this.emitProgress();
		}, 1000) as unknown as number;
	}

	private stopProgressUpdates(): void {
		if (this.progressInterval !== null) {
			clearInterval(this.progressInterval);
			this.progressInterval = null;
		}
	}

	// Public API methods that match the native implementations

	clear() {
		this.log('Clear');
		if (this.audio) {
			this.audio.pause();
			this.audio.currentTime = 0;
			this.currentTrack = null;
			this.emitStateChanged(AudioProState.IDLE);
		}
	}

	play(track: AudioProTrack, options: AudioProPlayOptions): void {
		const autoplay = options.autoPlay !== undefined ? options.autoPlay : true;
		this.log('Play', track, options, 'autoplay:', autoplay);
		this.currentTrack = track;
		this.debug = !!options.debug;
		this.playbackSpeed = 1.0;

		if (!this.audio) {
			this.emitError('Audio element not available in this environment');
			return;
		}

		// Web implementation doesn't support local audio files via require()
		if (typeof track.url === 'number') {
			this.emitError(
				'Local audio files via require() are not supported in web environment',
				-1,
			);
			return;
		}

		// Reset and configure the audio element
		this.audio.src = track.url;
		this.audio.playbackRate = this.playbackSpeed;
		this.audio.load();

		// Emit loading state
		this.emitStateChanged(AudioProState.LOADING);

		if (!autoplay) {
			emitter.emit('AudioProEvent', {
				type: AudioProEventType.STATE_CHANGED,
				track: this.currentTrack,
				payload: {
					state: AudioProState.PAUSED,
					position: 0,
					duration: 0,
				},
			});
		}

		if (autoplay) {
			this.audio.play().catch((error: Error) => {
				this.emitError(`Failed to play: ${error.message}`, -1);
			});
		}
	}

	pause(): void {
		this.log('Pause');
		if (this.audio) {
			this.audio.pause();
		}
	}

	resume(): void {
		this.log('Resume');
		if (this.audio) {
			this.audio.play().catch((error: Error) => {
				this.emitError(`Failed to resume: ${error.message}`, -1);
			});
		}
	}

	stop(): void {
		this.log('Stop');
		if (this.audio) {
			this.audio.pause();
			this.audio.currentTime = 0;
			this.emitStateChanged(AudioProState.STOPPED);
		}
		this.stopProgressUpdates();
	}

	seekTo(positionMs: number): void {
		this.log('SeekTo', positionMs);
		if (this.audio) {
			this.audio.currentTime = positionMs / 1000; // Convert ms to seconds
		}
	}

	seekForward(amountMs: number): void {
		this.log('SeekForward', amountMs);
		if (this.audio) {
			// Convert milliseconds to seconds for the HTML Audio API
			this.audio.currentTime = Math.min(
				this.audio.duration || 0,
				this.audio.currentTime + amountMs / 1000,
			);
		}
	}

	seekBack(amountMs: number): void {
		this.log('SeekBack', amountMs);
		if (this.audio) {
			// Convert milliseconds to seconds for the HTML Audio API
			this.audio.currentTime = Math.max(0, this.audio.currentTime - amountMs / 1000);
		}
	}

	setPlaybackSpeed(speed: number): void {
		this.log('SetPlaybackSpeed', speed);
		this.playbackSpeed = speed;

		if (this.audio) {
			this.audio.playbackRate = speed;

			emitter.emit('AudioProEvent', {
				type: AudioProEventType.PLAYBACK_SPEED_CHANGED,
				track: this.currentTrack,
				payload: {
					speed,
				},
			});
		}
	}
}

export const WebAudioPro: WebAudioProInterface = new WebAudioProImpl();
