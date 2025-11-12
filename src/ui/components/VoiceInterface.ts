import { VoiceUserInterface } from '../../interfaces/voice-user-interface';
import { AudioStream, AudioFormat } from '../../models/conversation-models';

export class VoiceInterface implements VoiceUserInterface {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private _isListening: boolean = false;
  private audioInputCallback: ((audioStream: AudioStream) => void) | null = null;
  private visualizationCanvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;

  constructor(canvasElement?: HTMLCanvasElement) {
    this.visualizationCanvas = canvasElement || null;
  }

  async startListening(): Promise<void> {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      // Initialize MediaRecorder for audio capture
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType()
      });

      const audioChunks: Blob[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        const audioStream: AudioStream = {
          data: arrayBuffer,
          timestamp: new Date(),
          sampleRate: this.audioContext?.sampleRate || 44100,
          channels: 1, // Mono recording
          format: AudioFormat.WAV
        };

        if (this.audioInputCallback) {
          this.audioInputCallback(audioStream);
        }
        audioChunks.length = 0;
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this._isListening = true;

      // Start visualization if canvas is available
      if (this.visualizationCanvas) {
        this.startVisualization();
      }

    } catch (error) {
      throw new Error(`Failed to start listening: ${error}`);
    }
  }

  async stopListening(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.microphone) {
      this.microphone.disconnect();
    }

    if (this.audioContext) {
      await this.audioContext.close();
    }

    this._isListening = false;

    // Stop visualization
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Stop all tracks to release microphone
    if (this.mediaRecorder?.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  isListening(): boolean {
    return this._isListening;
  }

  async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioBuffer = await this.audioContext.decodeAudioData(audioData);
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    return new Promise((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
  }

  onAudioInput(callback: (audioStream: AudioStream) => void): void {
    this.audioInputCallback = callback;
  }

  // Voice activity detection
  detectVoiceActivity(): boolean {
    if (!this.analyser) return false;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    
    // Voice activity threshold (adjustable)
    const threshold = 30;
    return average > threshold;
  }

  // Audio visualization
  private startVisualization(): void {
    if (!this.visualizationCanvas || !this.analyser) return;

    const canvas = this.visualizationCanvas;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this._isListening) return;

      this.animationId = requestAnimationFrame(draw);

      this.analyser!.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = 'rgb(20, 20, 20)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        const red = barHeight + 25 * (i / bufferLength);
        const green = 250 * (i / bufferLength);
        const blue = 50;

        canvasCtx.fillStyle = `rgb(${red},${green},${blue})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/wav'; // Fallback
  }

  // Getters for component state
  get listening(): boolean {
    return this._isListening;
  }

  get hasVoiceActivity(): boolean {
    return this.detectVoiceActivity();
  }
}