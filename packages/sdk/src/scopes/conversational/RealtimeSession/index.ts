import { EventEmitter } from "../../../EventEmitter";
import {
  AgentExecutionOptions,
  AgentExecutionOptionsWithParameters,
} from "../../../types";
import {
  RealtimeSessionEvents,
  SerenitySessionCreateEvent,
  SerenityEvent,
  SerenitySessionCreatedEvent,
  SerenitySessionCloseEvent,
  SerenitySessionErrorEvent,
  SDPConfiguration,
  SerenityResponseProcessedEvent,
} from "./types";

export class RealtimeSession extends EventEmitter<RealtimeSessionEvents> {
  private agentCode: string;
  private apiKey: string;
  private baseUrl: string;

  // Optional parameters.
  private inputParameters?: { [key: string]: any };
  private userIdentifier?: string;
  private agentVersion?: number;
  private channel?: string;

  private inactivityTimeout?: NodeJS.Timeout;
  private timeout = 120000; // 2 minutes

  // WebRTC configuration.
  private sessionConfiguration?: SDPConfiguration;
  private peerConnection?: RTCPeerConnection;
  private localStream?: MediaStream;
  private dataChannel?: RTCDataChannel;

  // WebSockets configuration.
  private socket?: WebSocket;

  constructor(
    agentCode: string,
    apiKey: string,
    baseUrl: string,
    options?: AgentExecutionOptionsWithParameters
  ) {
    super();
    this.apiKey = apiKey;
    this.agentCode = agentCode;
    this.baseUrl = baseUrl;

    this.agentVersion = options?.agentVersion;
    this.inputParameters = options?.inputParameters;
    this.userIdentifier = options?.userIdentifier;
    this.channel = options?.channel;
  }

  // #region Public methods

  /**
   * Starts the real-time session.
   */
  async start(): Promise<void> {
    try {
      this.#setupWebSocketConnection();
    } catch (error) {
      throw new Error(`Error starting the session`);
    }
  }

  /**
   * Stops the real-time session.
   */
  stop(): void {
    this.#stop();
  }

  /**
   * Allows the user to mute the microphone during a real-time voice session.
   */
  muteMicrophone(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
      }
    }
  }

  /**
   * Allows the user to unmute the microphone during a real-time voice session.
   */
  unmuteMicrophone(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
      }
    }
  }
  // #endregion

  // #region Private methods

  /**
   * Internal method to stop the session. Allows for a reason and details to be provided.
   * @param reason The reason for stopping the session.
   * @param details Additional details about the stop event.
   */
  #stop(reason?: string, details?: any): void {
    // Stop the local audio tracks.
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = undefined;
    }
    // Close the WebRTC connection if it is open.
    this.peerConnection && this.peerConnection.close();

    this.emit("session.stopped", reason, details);
    clearTimeout(this.inactivityTimeout);
  }

  #setupWebSocketConnection() {
    let url = `${this.baseUrl}/v2/agent/${this.agentCode}/realtime`;

    if (this.agentVersion) {
      url += `/${this.agentVersion}`;
    }

    this.socket = new WebSocket(url, ["X-API-KEY", this.apiKey]);

    this.socket.onopen = () => {
      const sessionCreateEvent: SerenitySessionCreateEvent = {
        type: "serenity.session.create",
        input_parameters: this.inputParameters,
        user_identifier: this.userIdentifier,
        channel: this.channel,
      };

      this.socket!.send(JSON.stringify(sessionCreateEvent));
    };

    this.socket.onclose = () => {
      this.#stop();
    };

    this.socket.onerror = (event) => {
      this.emit("error", "Error connecting to the server");
      this.#stop();
    };

    this.socket.onmessage = (event) => {
      this.#handleIncomingMessagesFromSerenity(event.data);
    };
  }

  async #handleIncomingMessagesFromSerenity(data: string) {
    const obj = JSON.parse(data) as SerenityEvent;
    switch (obj.type) {
      case "serenity.session.created": {
        const eventData = obj as SerenitySessionCreatedEvent;
        this.sessionConfiguration = {
          url: eventData.url,
          headers: eventData.headers,
        };

        // Setup the WebRTC connection.
        this.#setupWebRTCConnection();

        // Add listeners for the WebRTC connection.
        this.#handleIncomingMessagesFromVendor();

        // Start the session.
        await this.#startSession();

        break;
      }
      case "serenity.session.close": {
        const eventData = obj as SerenitySessionCloseEvent;
        const errorDetails = this.#extractErrorMessageFromEvent(eventData);
        this.emit("error", errorDetails);
        this.#stop(eventData.reason, errorDetails);
        break;
      }
      case "serenity.response.processed": {
        const eventData = obj as SerenityResponseProcessedEvent;
        this.emit("response.processed", eventData.result);
        break;
      }
      default: {
        const isSerenityEvent = obj.type.startsWith("serenity");
        if (this.dataChannel && !isSerenityEvent) {
          this.dataChannel.send(JSON.stringify(obj));
        }
      }
    }
  }

  #handleIncomingMessagesFromVendor() {
    if (!this.peerConnection) {
      throw new Error(
        `Could not add listeners: WebRTC connection not initialized`
      );
    }
    // Set up data channel for sending and receiving events
    const currentDate = new Date()
      .toISOString()
      .replace(/T/, "-")
      .replace(/:/g, "-")
      .replace(/\..+/, "");
    const channelName = `data-channel-${this.agentCode}-${currentDate}`;
    this.dataChannel = this.peerConnection.createDataChannel(channelName);

    this.dataChannel.addEventListener("message", (e: MessageEvent) => {
      this.#resetInactivityTimeout();
      const data = JSON.parse(e.data);

      try {
        switch (data.type) {
          case "input_audio_buffer.speech_started": {
            this.emit("speech.started");
            break;
          }
          case "input_audio_buffer.speech_stopped": {
            this.emit("speech.stopped");
            break;
          }

          case "response.done": {
            this.emit("response.done");
            break;
          }
          case "error": {
            this.emit("error", "There was an error processing your request");
            break;
          }
        }
      } catch (error) {
        this.emit("error", "Error processing incoming messages from vendor");
      } finally {
        // Forward the message to the server
        if (this.socket) {
          this.socket.send(JSON.stringify(data));
        }
      }
    });
  }

  #setupWebRTCConnection() {
    // Create the peer connection.
    this.peerConnection = new RTCPeerConnection();

    // Configure remote audio playback.
    const audioElement = document.createElement("audio");
    audioElement.autoplay = true;

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        audioElement.srcObject = event.streams[0];
      }
    };
  }

  async #getAudioFromMicrophone(): Promise<void> {
    if (!this.peerConnection) {
      throw new Error(
        `Could not start the session: WebRTC connection not initialized`
      );
    }

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const audioTrack = this.localStream.getTracks()[0];
    this.peerConnection.addTrack(audioTrack, this.localStream);
  }

  async #startSession() {
    if (!this.peerConnection) {
      throw new Error(
        `Could not start the session: WebRTC connection not initialized`
      );
    }

    if (!this.sessionConfiguration) {
      throw new Error(
        `Could not start the session: Session configuration not available`
      );
    }

    try {
      // Get the audio from the microphone.
      await this.#getAudioFromMicrophone();

      // Start the session using the Session Description Protocol (SDP)
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      const sdpResponse = await fetch(`${this.sessionConfiguration.url}`, {
        method: "POST",
        body: offer.sdp,
        headers: this.sessionConfiguration.headers,
      });

      if (!sdpResponse.ok) {
        throw new Error("Error starting the session");
      }

      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };

      await this.peerConnection.setRemoteDescription(answer);

      this.emit("session.created");
      this.#resetInactivityTimeout();
    } catch (error) {
      this.emit("error", "Error starting the session");
      this.#stop();
    }
  }

  #resetInactivityTimeout() {
    clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = setTimeout(() => {
      this.#stop();
    }, this.timeout);
  }

  #extractErrorMessageFromEvent(eventData: SerenitySessionErrorEvent) {
    switch (eventData.reason) {
      case "Exception":
        return eventData.message;
      case "ValidationException": {
        if (!eventData.errors) return eventData.message;

        return Object.values(eventData.errors).join(". ");
      }
      default:
        return eventData.message;
    }
  }
  // #endregion
}
