import { EventEmitter } from "../../../EventEmitter";
import { AgentSetupOptions } from "../../../types";
import { AuthProvider } from "../../../auth/AuthProvider";
import {
  RealtimeSessionEvents,
  SerenitySessionCreateEvent,
  SerenityEvent,
  SerenitySessionCreatedEvent,
  SerenitySessionCloseEvent,
  SerenitySessionErrorEvent,
  SDPConfiguration,
  SerenityResponseProcessedEvent,
  RealtimeErrorDetails,
} from "./types";

export class RealtimeSession extends EventEmitter<RealtimeSessionEvents> {
  private agentCode: string;
  private authProvider: AuthProvider;
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
  /**
   * `#stop` runs twice for a server-initiated close: once from the close-frame handler and
   * again from `socket.onclose`, which it triggers itself. Guard so `session.stopped` is
   * emitted once, with the reason of whichever call came first.
   */
  private hasStopped = false;

  constructor(
    agentCode: string,
    authProvider: AuthProvider,
    baseUrl: string,
    options?: AgentSetupOptions
  ) {
    super();
    this.authProvider = authProvider;
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
    this.hasStopped = false;
    try {
      await this.#setupWebSocketConnection();
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
    if (this.hasStopped) return;
    this.hasStopped = true;

    // Send a closure message to the server if socket is connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        // Close the WebSocket connection properly
        this.socket.close(1000, "Client closed the session");
      } catch (error) {
        console.error("Error closing WebSocket connection:", error);
      }
    }
    
    // Stop the local audio tracks.
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = undefined;
    }
    
    // Close the WebRTC connection if it is open.
    this.peerConnection && this.peerConnection.close();
    
    // Reset variables
    this.socket = undefined;
    this.dataChannel = undefined;
    this.peerConnection = undefined;

    this.emit("session.stopped", reason, details);
    clearTimeout(this.inactivityTimeout);
  }

  async #setupWebSocketConnection() {
    let url = `${this.baseUrl}/v2/agent/${this.agentCode}/realtime`;

    if (this.agentVersion) {
      url += `/${this.agentVersion}`;
    }

    const protocols = await this.authProvider.getWebSocketProtocols();
    this.socket = new WebSocket(url, protocols);

    this.socket.onopen = () => {
      const sessionCreateEvent: SerenitySessionCreateEvent = {
        type: "serenity.session.create",
        input_parameters: this.inputParameters,
        user_identifier: this.userIdentifier,
        channel: this.channel,
      };

      this.socket!.send(JSON.stringify(sessionCreateEvent));
    };

    this.socket.onclose = (event) => {
      // The close frame is the only diagnostic for an abnormal termination, so carry its
      // code and reason into `session.stopped` rather than dropping them.
      this.#stop(event.reason || undefined, {
        closeCode: event.code,
        closeReason: event.reason || undefined,
        wasClean: event.wasClean,
      });
    };

    this.socket.onerror = (event) => {
      this.emit("error", "Error connecting to the server", { source: "client" });
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
        const errorMessage = this.#extractErrorMessageFromEvent(eventData);
        const details: RealtimeErrorDetails = {
          source: eventData.reason === "VendorException" ? "vendor" : "session",
          reason: eventData.reason,
          errors: eventData.errors,
        };
        this.emit("error", errorMessage, details);
        this.#stop(eventData.reason, errorMessage);
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
            this.emit("error", "There was an error processing your request", {
              source: "vendor",
            });
            break;
          }
        }
      } catch (error) {
        this.emit("error", "Error processing incoming messages from vendor", {
          source: "client",
        });
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
      this.emit("error", "Error starting the session", { source: "client" });
      this.#stop();
    }
  }

  #resetInactivityTimeout() {
    clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = setTimeout(() => {
      this.#stop();
    }, this.timeout);
  }

  /**
   * Flatten a close frame into a single displayable message.
   *
   * `"VendorException"` replaced `"ValidationException"` as the reason for provider faults;
   * both are handled, and the `errors` dictionary is joined for **any** reason — including
   * one this SDK version does not recognise — so a server-side rename can never silently
   * discard the detail again.
   */
  #extractErrorMessageFromEvent(eventData: SerenitySessionErrorEvent): string {
    const details = eventData.errors
      ? Object.values(eventData.errors)
          .filter((value) => typeof value === "string" && value.trim().length > 0)
          .join(". ")
      : "";

    if (!details) return eventData.message;
    if (!eventData.message) return details;
    // `Exception` carries a self-contained message; every other reason pairs a generic
    // message with the dictionary that explains it.
    return eventData.reason === "Exception"
      ? eventData.message
      : details;
  }
  // #endregion
}
