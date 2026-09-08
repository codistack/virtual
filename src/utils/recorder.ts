/**
 * Professional Meeting & Class Recording Engine
 * Utilizes MediaRecorder API with Web Audio API mixing for HD video & audio.
 */

export interface RecordedFile {
  blob: Blob;
  url: string;
  filename: string;
  sizeBytes: number;
  durationSeconds: number;
  mimeType: string;
}

export class MeetingRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private streamToRecord: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private startTime = 0;
  private pausedDuration = 0;
  private pauseStartTime = 0;
  private timerInterval: any = null;

  public onTimeUpdate?: (seconds: number) => void;
  public onStateChange?: (state: 'inactive' | 'recording' | 'paused') => void;

  /**
   * Starts recording the meeting.
   * Can mix screen/tab display with local mic audio.
   */
  async startRecording(
    options: {
      screenStream?: MediaStream | null;
      localMicStream?: MediaStream | null;
      captureDisplay?: boolean;
    } = {}
  ): Promise<void> {
    this.recordedChunks = [];
    let combinedStream: MediaStream;

    try {
      let captureStream: MediaStream | null = options.screenStream || null;

      // If requested to capture screen/window/tab for full meeting recording
      if (!captureStream && options.captureDisplay !== false) {
        try {
          captureStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'browser',
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              frameRate: { ideal: 30 }
            },
            audio: true // Capture system / tab audio if available
          });
        } catch (err) {
          console.warn('DisplayMedia capture was cancelled or failed, falling back to camera stream:', err);
        }
      }

      // If we still don't have a stream, fallback to local camera/mic stream
      if (!captureStream) {
        if (options.localMicStream) {
          captureStream = options.localMicStream;
        } else {
          throw new Error('No hay señal de video o audio disponible para iniciar la grabación.');
        }
      }

      // Audio mixing if we have both display audio and local mic
      if (options.localMicStream && captureStream !== options.localMicStream) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          this.audioContext = new AudioContextClass();
          this.audioDestination = this.audioContext.createMediaStreamDestination();

          // Mix mic stream
          const micSource = this.audioContext.createMediaStreamSource(options.localMicStream);
          micSource.connect(this.audioDestination);

          // Mix screen/system audio if present
          if (captureStream.getAudioTracks().length > 0) {
            const displayAudioSource = this.audioContext.createMediaStreamSource(captureStream);
            displayAudioSource.connect(this.audioDestination);
          }

          // Combine video track with mixed audio track
          const mixedAudioTrack = this.audioDestination.stream.getAudioTracks()[0];
          const videoTrack = captureStream.getVideoTracks()[0];

          const finalTracks: MediaStreamTrack[] = [];
          if (videoTrack) finalTracks.push(videoTrack);
          if (mixedAudioTrack) finalTracks.push(mixedAudioTrack);

          combinedStream = new MediaStream(finalTracks);
        } catch (e) {
          console.warn('AudioContext mixing error, using direct capture tracks:', e);
          combinedStream = captureStream;
        }
      } else {
        combinedStream = captureStream;
      }

      this.streamToRecord = combinedStream;

      // Pick best supported MIME type
      const mimeTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];

      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000,
      };
      if (selectedMimeType) {
        recorderOptions.mimeType = selectedMimeType;
      }

      this.mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Listen for when user stops screen share from browser banner
      const videoTrack = combinedStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.stopRecording();
          }
        };
      }

      this.mediaRecorder.start(1000); // 1-second timeslice for stable chunking
      this.startTime = Date.now();
      this.pausedDuration = 0;

      this.startTimer();
      this.onStateChange?.('recording');
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  private startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.mediaRecorder?.state === 'recording') {
        const totalElapsed = Math.floor((Date.now() - this.startTime - this.pausedDuration) / 1000);
        this.onTimeUpdate?.(Math.max(0, totalElapsed));
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pauseStartTime = Date.now();
      this.onStateChange?.('paused');
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      if (this.pauseStartTime > 0) {
        this.pausedDuration += (Date.now() - this.pauseStartTime);
        this.pauseStartTime = 0;
      }
      this.onStateChange?.('recording');
    }
  }

  async stopRecording(): Promise<RecordedFile> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        return reject(new Error('No hay grabación activa para detener.'));
      }

      this.stopTimer();
      const totalSeconds = Math.floor((Date.now() - this.startTime - this.pausedDuration) / 1000);

      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
          const isMp4 = mimeType.includes('mp4');
          const ext = isMp4 ? 'mp4' : 'webm';
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const filename = `Clase_Grabacion_${timestamp}.${ext}`;

          const result: RecordedFile = {
            blob,
            url,
            filename,
            sizeBytes: blob.size,
            durationSeconds: Math.max(1, totalSeconds),
            mimeType
          };

          this.cleanup();
          this.onStateChange?.('inactive');
          resolve(result);
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  getState(): 'inactive' | 'recording' | 'paused' {
    return this.mediaRecorder?.state || 'inactive';
  }

  private cleanup() {
    this.stopTimer();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
    this.audioDestination = null;
    this.streamToRecord = null;
  }
}

/**
 * Downloads a recording directly to the client's local disk
 */
export function downloadRecordedFile(file: RecordedFile) {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = file.url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}
