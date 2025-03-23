/**
 * Wrapper for client-side TikTok connection over Socket.IO
 * With reconnect functionality.
 */
import { io } from 'socket.io-client';

class TikTokConnection {
    constructor(backendUrl) {
        this.socket = io(backendUrl);
        this.uniqueId = null;
        this.options = null;
        this.streamUrl = null;
        this.isConnected = false;
        this.RoomPrompt=null;
        this.RoomMessage=null;

        this.socket.on('connect', () => {
            console.info("Socket connected!");

            // Reconnect to streamer if uniqueId already set
            if (this.uniqueId) {
                this.setUniqueId();
            }
        });

        this.socket.on('disconnect', () => {
            console.warn("Socket disconnected!");
            this.isConnected = false;
        });

        this.socket.on('streamEnd', () => {
            console.warn("LIVE has ended!");
            this.uniqueId = null;
            this.isConnected = false;
            this.streamUrl = null;
        });

        this.socket.on('tiktokDisconnected', (errMsg) => {
            console.warn(errMsg);
            if (errMsg && errMsg.includes('LIVE has ended')) {
                this.uniqueId = null;
                this.isConnected = false;
                this.streamUrl = null;
            }
        });
    }

    connect(uniqueId, options) {
        this.uniqueId = uniqueId;
        this.options = options || {};

        this.setUniqueId();

        return new Promise((resolve, reject) => {
            this.socket.once('tiktokConnected', (state, data) => {

                console.log('Connected to room', state.roomId);
                console.log(state);

                console.log(data);
                if(state.roomInfo){
                    console.log(state.roomInfo);
                    if(state.roomInfo.message && state.roomInfo.prompt){
                        this.RoomPrompt=state.roomInfo.prompt;
                        this.RoomMessage=state.roomInfo.message;
                    }
                }
                // Store stream URL if available
                if (state.roomInfo && state.roomInfo.stream_url && state.roomInfo.stream_url.flv_pull_url) {
                    this.streamUrl = state.roomInfo.stream_url.flv_pull_url;
                    console.log('Stream URL:', this.streamUrl);
                } else {
                    console.warn('No stream URL available in roomInfo');
                    this.streamUrl = null;
                }
                
                this.isConnected = true;
                resolve(state, data);
            });
            
            this.socket.once('tiktokDisconnected', reject);

            setTimeout(() => {
                reject('Connection Timeout');
            }, 15000);
        });
    }

    setUniqueId() {
        this.socket.emit('setUniqueId', this.uniqueId, this.options);
    }

    on(eventName, eventHandler) {
        this.socket.on(eventName, eventHandler);
    }
    
    getStreamUrl() {
        return this.streamUrl;
    }
}

export default TikTokConnection; 