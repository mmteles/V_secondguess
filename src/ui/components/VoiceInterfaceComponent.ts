import { VoiceInterface } from './VoiceInterface';
import { AudioStream } from '../../models/conversation-models';

export class VoiceInterfaceComponent {
  private voiceInterface: VoiceInterface;
  private container: HTMLElement;
  private recordButton: HTMLButtonElement;
  private statusIndicator: HTMLElement;
  private visualizationCanvas: HTMLCanvasElement;
  private volumeIndicator: HTMLElement;
  private onAudioCallback: ((audioStream: AudioStream) => void) | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id '${containerId}' not found`);
    }
    
    this.container = container;
    this.createInterface();
    this.voiceInterface = new VoiceInterface(this.visualizationCanvas);
    this.setupEventListeners();
  }

  private createInterface(): void {
    this.container.innerHTML = `
      <div class="voice-interface">
        <div class="voice-controls">
          <button id="recordButton" class="record-button">
            <span class="record-icon">🎤</span>
            <span class="record-text">Start Recording</span>
          </button>
          <div id="statusIndicator" class="status-indicator">
            <span class="status-text">Ready</span>
          </div>
        </div>
        
        <div class="audio-visualization">
          <canvas id="visualizationCanvas" width="400" height="100"></canvas>
          <div id="volumeIndicator" class="volume-indicator">
            <div class="volume-bar"></div>
          </div>
        </div>
        
        <div class="voice-activity-indicator">
          <div id="voiceActivity" class="voice-activity-light"></div>
          <span>Voice Activity</span>
        </div>
      </div>
    `;

    // Get references to created elements
    this.recordButton = this.container.querySelector('#recordButton') as HTMLButtonElement;
    this.statusIndicator = this.container.querySelector('#statusIndicator') as HTMLElement;
    this.visualizationCanvas = this.container.querySelector('#visualizationCanvas') as HTMLCanvasElement;
    this.volumeIndicator = this.container.querySelector('#volumeIndicator') as HTMLElement;

    this.addStyles();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .voice-interface {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        color: white;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .voice-controls {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
      }

      .record-button {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px 25px;
        background: #ff6b6b;
        border: none;
        border-radius: 50px;
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
      }

      .record-button:hover {
        background: #ff5252;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
      }

      .record-button.recording {
        background: #4ecdc4;
        animation: pulse 1.5s infinite;
      }

      .record-button.recording .record-text::after {
        content: "...";
        animation: dots 1.5s infinite;
      }

      @keyframes pulse {
        0% { box-shadow: 0 4px 15px rgba(78, 205, 196, 0.4); }
        50% { box-shadow: 0 4px 25px rgba(78, 205, 196, 0.8); }
        100% { box-shadow: 0 4px 15px rgba(78, 205, 196, 0.4); }
      }

      @keyframes dots {
        0%, 20% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }

      .record-icon {
        font-size: 20px;
      }

      .status-indicator {
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 25px;
        backdrop-filter: blur(10px);
      }

      .status-text {
        font-weight: 500;
      }

      .audio-visualization {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
      }

      #visualizationCanvas {
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.3);
      }

      .volume-indicator {
        width: 200px;
        height: 8px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        overflow: hidden;
      }

      .volume-bar {
        height: 100%;
        background: linear-gradient(90deg, #4ecdc4, #44a08d);
        width: 0%;
        transition: width 0.1s ease;
        border-radius: 4px;
      }

      .voice-activity-indicator {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
      }

      .voice-activity-light {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #666;
        transition: all 0.3s ease;
      }

      .voice-activity-light.active {
        background: #4ecdc4;
        box-shadow: 0 0 10px #4ecdc4;
      }

      .record-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  private setupEventListeners(): void {
    this.recordButton.addEventListener('click', this.toggleRecording.bind(this));
    
    // Set up voice interface callbacks
    this.voiceInterface.onAudioInput((audioStream: AudioStream) => {
      if (this.onAudioCallback) {
        this.onAudioCallback(audioStream);
      }
    });

    // Monitor voice activity
    this.startVoiceActivityMonitoring();
  }

  private async toggleRecording(): Promise<void> {
    try {
      if (this.voiceInterface.listening) {
        await this.stopRecording();
      } else {
        await this.startRecording();
      }
    } catch (error) {
      this.updateStatus(`Error: ${error}`, 'error');
      console.error('Recording error:', error);
    }
  }

  private async startRecording(): Promise<void> {
    this.recordButton.disabled = true;
    this.updateStatus('Starting...', 'loading');

    try {
      await this.voiceInterface.startListening();
      
      this.recordButton.classList.add('recording');
      this.recordButton.querySelector('.record-text')!.textContent = 'Stop Recording';
      this.recordButton.disabled = false;
      this.updateStatus('Recording', 'recording');
    } catch (error) {
      this.recordButton.disabled = false;
      throw error;
    }
  }

  private async stopRecording(): Promise<void> {
    this.recordButton.disabled = true;
    this.updateStatus('Stopping...', 'loading');

    try {
      await this.voiceInterface.stopListening();
      
      this.recordButton.classList.remove('recording');
      this.recordButton.querySelector('.record-text')!.textContent = 'Start Recording';
      this.recordButton.disabled = false;
      this.updateStatus('Ready', 'ready');
    } catch (error) {
      this.recordButton.disabled = false;
      throw error;
    }
  }

  private updateStatus(message: string, type: 'ready' | 'recording' | 'loading' | 'error' = 'ready'): void {
    const statusText = this.statusIndicator.querySelector('.status-text') as HTMLElement;
    statusText.textContent = message;
    
    // Update status indicator styling based on type
    this.statusIndicator.className = `status-indicator status-${type}`;
  }

  private startVoiceActivityMonitoring(): void {
    const voiceActivityLight = this.container.querySelector('#voiceActivity') as HTMLElement;
    const volumeBar = this.volumeIndicator.querySelector('.volume-bar') as HTMLElement;

    const monitor = () => {
      if (this.voiceInterface.listening) {
        const hasActivity = this.voiceInterface.hasVoiceActivity;
        
        if (hasActivity) {
          voiceActivityLight.classList.add('active');
          // Simulate volume level (in real implementation, get actual volume)
          const volume = Math.random() * 100;
          volumeBar.style.width = `${volume}%`;
        } else {
          voiceActivityLight.classList.remove('active');
          volumeBar.style.width = '0%';
        }
      } else {
        voiceActivityLight.classList.remove('active');
        volumeBar.style.width = '0%';
      }

      requestAnimationFrame(monitor);
    };

    monitor();
  }

  // Public methods
  onAudioInput(callback: (audioStream: AudioStream) => void): void {
    this.onAudioCallback = callback;
  }

  async playAudio(audioData: AudioBuffer): Promise<void> {
    return this.voiceInterface.playAudio(audioData);
  }

  get isRecording(): boolean {
    return this.voiceInterface.listening;
  }

  destroy(): void {
    if (this.voiceInterface.listening) {
      this.voiceInterface.stopListening();
    }
  }
}