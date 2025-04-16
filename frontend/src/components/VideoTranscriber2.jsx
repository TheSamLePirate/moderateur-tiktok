import { useEffect, useRef, useState } from 'react'
import flvjs from 'flv.js'
import VolumeViewmeter from './VolumeViewmeter'

const VideoPlayer = ({ username, enableFlvStream, connectionRef,openaiApiKey }) => {
  const videoPlayerRef = useRef(null)
  const flvPlayerRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioSourceRef = useRef(null)
  const audioProcessorRef = useRef(null)
  const audioAnalyserRef = useRef(null)
  const [streamError, setStreamError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordedChunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('HD1'); // Default quality
  const [silenceThreshold, setSilenceThreshold] = useState(0.05);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // New state for tracking mute status
  const gainNodeRef = useRef(null); // Reference to gain node for custom volume control
  const [promptList, setPromptList] = useState('');
  
  // New states and refs for delayed playback
  const [isPlayingDelayed, setIsPlayingDelayed] = useState(false);
  const delayedPlayerRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const transcriptChunksRef = useRef([]);
  const playbackStartTimeRef = useRef(null);
  const [displayedTranscript, setDisplayedTranscript] = useState('');
  const [showLiveStream, setShowLiveStream] = useState(true);
  // Add new refs for continuous playback
  const lastUpdateTimeRef = useRef(0);
  const updateIntervalRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const pendingChunksRef = useRef([]);
  const playbackDelayMs = 15000; // 15 seconds delay
  // Add adjustable offset for fine-tuning the subtitle timing
  const [subtitleTimingOffset, setSubtitleTimingOffset] = useState(0);
  const [showTimingDebug, setShowTimingDebug] = useState(false);
  const [currentDebugInfo, setCurrentDebugInfo] = useState({});

  // New states for subtitle display
  const [fadeClass, setFadeClass] = useState('');
  const previousSubtitleRef = useRef('');
  const fadeTimeoutRef = useRef(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [displayedTranscript]);

  // Effect to handle the delayed playback timing
  useEffect(() => {
    if (isTranscribing && !isPlayingDelayed) {
      // Start delayed playback after 15 seconds of recording
      const delayTimer = setTimeout(() => {
        startDelayedPlayback();
      }, playbackDelayMs);
      
      return () => clearTimeout(delayTimer);
    }
  }, [isTranscribing, isPlayingDelayed]);
  
  // Effect to update displayed transcript based on playback time
  useEffect(() => {
    if (isPlayingDelayed && delayedPlayerRef.current && transcriptChunksRef.current.length > 0) {
      const updateInterval = setInterval(() => {
        updateDisplayedTranscript();
      }, 200); // Update 5 times per second for smoother transitions
      
      return () => clearInterval(updateInterval);
    }
  }, [isPlayingDelayed]);

  // Effect to handle continuous recording updates
  useEffect(() => {
    if (isPlayingDelayed && isRecording) {
      // Set up interval to update the playback with new recorded chunks
      updateIntervalRef.current = setInterval(() => {
        updateContinuousPlayback();
      }, 2000); // Check for new chunks every 2 seconds
      
      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
      };
    }
  }, [isPlayingDelayed, isRecording]);

  // The rest of your existing useEffects
  useEffect(() => {
    if (enableFlvStream && flvjs.isSupported() && connectionRef && connectionRef.current) {
      setIsLoading(true)
      initializeVideoPlayer()
      
      // Initialize audio context when playback starts
      const handlePlaying = () => {
        if (videoPlayerRef.current && !audioContextRef.current) {
          initializeAudioCapture();
        }
      };
      
      if (videoPlayerRef.current) {
        videoPlayerRef.current.addEventListener('playing', handlePlaying);
      }
      
      return () => {
        if (videoPlayerRef.current) {
          videoPlayerRef.current.removeEventListener('playing', handlePlaying);
        }
      };
    }
    
    return () => {
      destroyPlayer()
      destroyAudioCapture()
      cleanupDelayedPlayback();
    }
  }, [username, enableFlvStream, connectionRef])
  
  // Add new effect to reload the player when quality changes
  useEffect(() => {
    if (streamUrl && selectedQuality && streamUrl[selectedQuality]) {
      destroyPlayer();
      console.log("Selected quality:", selectedQuality);
      createPlayer(streamUrl[selectedQuality]);
    }
  }, [selectedQuality]);
  
  // Function to clean up delayed playback
  const cleanupDelayedPlayback = () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    if (delayedPlayerRef.current) {
      delayedPlayerRef.current.pause();
      if (delayedPlayerRef.current.src) {
        URL.revokeObjectURL(delayedPlayerRef.current.src);
      }
      delayedPlayerRef.current = null;
    }
    
    if (mediaSourceRef.current) {
      try {
        if (sourceBufferRef.current) {
          mediaSourceRef.current.removeSourceBuffer(sourceBufferRef.current);
          sourceBufferRef.current = null;
        }
        mediaSourceRef.current = null;
      } catch (error) {
        console.error('Error cleaning up MediaSource:', error);
      }
    }
    
    pendingChunksRef.current = [];
    lastUpdateTimeRef.current = 0;
    setIsPlayingDelayed(false);
    playbackStartTimeRef.current = null;
  };
  
  // Function to start the delayed playback after 15 seconds
  const startDelayedPlayback = () => {
    if (!isRecording || recordedChunksRef.current.length === 0) return;
    
    try {
      // Create a blob from recorded chunks so far
      const fileExtension = mediaRecorderRef.current.fileExtension || 'webm';
      const mimeType = fileExtension === 'mp4' ? 'video/mp4' : 'video/webm';
      const recordedBlob = new Blob([...recordedChunksRef.current], { type: mimeType });
      
      // Create URL for the recorded blob
      const recordedVideoUrl = URL.createObjectURL(recordedBlob);
      
      // Create a video element for playback
      const delayedPlayer = document.createElement('video');
      delayedPlayer.src = recordedVideoUrl;
      delayedPlayer.controls = true;
      delayedPlayer.autoplay = true;
      delayedPlayer.className = "w-full h-full rounded-xl";
      
      // Track when playback reaches the end to handle looping or continuous playback
      delayedPlayer.addEventListener('timeupdate', handleTimeUpdate);
      
      // Replace the reference
      delayedPlayerRef.current = delayedPlayer;
      
      // Set the delayed playback container to show the recorded video
      const container = document.getElementById('delayed-playback-container');
      if (container) {
        // Clear container and add the new player
        container.innerHTML = '';
        container.appendChild(delayedPlayer);
        
        // Mark the start time of playback for transcript sync
        playbackStartTimeRef.current = Date.now();
        lastUpdateTimeRef.current = Date.now();
        setIsPlayingDelayed(true);
        setShowLiveStream(false);
        
        console.log("Started delayed playback with initial recording");
      }
    } catch (error) {
      console.error('Error starting delayed playback:', error);
    }
  };
  
  // Handler for time updates from the video player
  const handleTimeUpdate = () => {
    if (!delayedPlayerRef.current) return;
    
    const player = delayedPlayerRef.current;
    
    // Check if we're near the end of the current video
    if (player.duration > 0 && 
        player.currentTime > 0 && 
        player.currentTime > player.duration - 0.5) {
      // Update with new content if available
      updateContinuousPlayback(true); // Force update
    }
  };
  
  // Function to update continuous playback with new recorded chunks
  const updateContinuousPlayback = (forceUpdate = false) => {
    // Only update if we have a player and there are new chunks
    if (!delayedPlayerRef.current || 
        !isRecording || 
        recordedChunksRef.current.length === 0 ||
        !mediaRecorderRef.current) {
      return;
    }
    
    const now = Date.now();
    const player = delayedPlayerRef.current;
    
    // Check if it's time to update (at least 2 seconds passed since last update, or force update)
    if (!forceUpdate && now - lastUpdateTimeRef.current < 2000) {
      return;
    }
    
    try {
      // Create a blob with all recorded chunks
      const fileExtension = mediaRecorderRef.current.fileExtension || 'webm';
      const mimeType = fileExtension === 'mp4' ? 'video/mp4' : 'video/webm';
      
      // Get current playback position
      const currentTime = player.currentTime;
      const currentPlaybackPosition = currentTime;
      
      // Create blob with all chunks
      const fullRecording = new Blob([...recordedChunksRef.current], { type: mimeType });
      
      // Create new URL
      if (player.src) {
        URL.revokeObjectURL(player.src);
      }
      
      const newSrc = URL.createObjectURL(fullRecording);
      player.src = newSrc;
      
      // Wait for metadata to load, then seek to correct position
      player.onloadedmetadata = () => {
        // Calculate how much time has passed in the recording
        
        // Seek to correct position
        const seekTo = Math.min(currentPlaybackPosition, Math.max(0, player.duration - 1));
        player.currentTime = seekTo;
        
        // If we were near the end, play should resume automatically
        if (player.paused) {
          player.play().catch(e => console.error('Error resuming playback:', e));
        }
      };
      
      lastUpdateTimeRef.current = now;
      console.log(`Updated continuous playback at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error updating continuous playback:', error);
    }
  };
  
  // Function to update the displayed transcript based on current playback time
  const updateDisplayedTranscript = () => {
    if (!delayedPlayerRef.current || !recordingStartTimeRef.current || transcriptChunksRef.current.length === 0) return;
    
    // Calculate current playback position in milliseconds from recording start
    const currentPlaybackTimeMs = delayedPlayerRef.current.currentTime * 1000;
    
    // Apply the fine-tuning offset
    const adjustedPlaybackTime = currentPlaybackTimeMs + subtitleTimingOffset;

    // Debug information
    const debugInfo = {
      playerTimeMs: Math.round(currentPlaybackTimeMs),
      adjustedTimeMs: Math.round(adjustedPlaybackTime),
      offset: subtitleTimingOffset,
      recordingStarted: new Date(recordingStartTimeRef.current).toISOString().substr(11, 8),
      playbackStarted: playbackStartTimeRef.current ? 
        new Date(playbackStartTimeRef.current).toISOString().substr(11, 8) : 'N/A',
      chunksTotal: transcriptChunksRef.current.length,
    };
    
    // Update debug info if debugging is enabled
    if (showTimingDebug) {
      setCurrentDebugInfo(debugInfo);
    }
    
    // Find ALL subtitles that might be active at this timestamp
    const potentialSubtitles = transcriptChunksRef.current.filter(
      chunk => {
        // Use a sliding window approach based on current playback position
        // This gives a bit more leeway for timing variations
        const windowStart = chunk.timestamp - 750;  // 750ms before (increased window)
        const windowEnd = chunk.endTimestamp + 750; // 750ms after (increased window)
        
        return windowStart <= adjustedPlaybackTime && 
               windowEnd >= adjustedPlaybackTime;
      }
    );
    
    if (potentialSubtitles.length > 0) {
      // Sort by relevance score to get the most appropriate subtitle
      const sortedSubtitles = [...potentialSubtitles].sort((a, b) => {
        // Calculate how well each subtitle matches the current time
        // Lower score is better (closer match)
        const aCenter = a.timestamp + (a.duration / 2);
        const bCenter = b.timestamp + (b.duration / 2);
        const aDistance = Math.abs(adjustedPlaybackTime - aCenter);
        const bDistance = Math.abs(adjustedPlaybackTime - bCenter);
        
        // Return the subtitle with the lower distance (better match)
        return aDistance - bDistance;
      });
      
      // Choose the best matching subtitle
      const bestSubtitle = sortedSubtitles[0];
      
      // Only update if text has changed or if we're debugging
      if (bestSubtitle.text !== displayedTranscript || showTimingDebug) {
        // Update debug info with subtitle details
        if (showTimingDebug) {
          debugInfo.selectedSubtitle = {
            text: bestSubtitle.text.substring(0, 30) + (bestSubtitle.text.length > 30 ? '...' : ''),
            timestamp: bestSubtitle.timestamp,
            endTimestamp: bestSubtitle.endTimestamp,
            duration: bestSubtitle.duration,
            distanceFromIdeal: Math.round(adjustedPlaybackTime - bestSubtitle.timestamp),
            score: Math.round(Math.abs(adjustedPlaybackTime - (bestSubtitle.timestamp + bestSubtitle.duration/2)))
          };
          setCurrentDebugInfo(debugInfo);
        }
        
        // Store current subtitle before changing
        previousSubtitleRef.current = displayedTranscript;
        
        // Add fade-out class
        setFadeClass('fade-out');
        
        // Clear any existing timeout
        if (fadeTimeoutRef.current) {
          clearTimeout(fadeTimeoutRef.current);
        }
        
        // Set a brief timeout for the fade effect
        fadeTimeoutRef.current = setTimeout(() => {
          setDisplayedTranscript(bestSubtitle.text);
          setFadeClass('fade-in');
          
          // Reset to normal after fade in completes
          fadeTimeoutRef.current = setTimeout(() => {
            setFadeClass('');
          }, 300);
        }, 300);
        
        if (showTimingDebug) {
          console.log(`Displaying subtitle at ${adjustedPlaybackTime}ms (video time: ${currentPlaybackTimeMs}ms): "${bestSubtitle.text.substring(0, 30)}..."`, 
            `[Score: ${Math.round(Math.abs(adjustedPlaybackTime - (bestSubtitle.timestamp + bestSubtitle.duration/2)))}]`);
        }
      }
    } else {
      // If no active subtitles and we have text displayed, clear it
      if (displayedTranscript !== '') {
        // Add fade-out class
        setFadeClass('fade-out');
        
        // Clear any existing timeout
        if (fadeTimeoutRef.current) {
          clearTimeout(fadeTimeoutRef.current);
        }
        
        // Set a brief timeout for the fade effect
        fadeTimeoutRef.current = setTimeout(() => {
          setDisplayedTranscript('');
          setFadeClass('');
          
          // Update debug info
          if (showTimingDebug) {
            debugInfo.selectedSubtitle = null;
            setCurrentDebugInfo(debugInfo);
          }
        }, 300);
      }
    }
  };
  
  // Clean up fade timeout on component unmount
  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);
  
  // Function to toggle between live stream and delayed playback
  const toggleVideoView = () => {
    setShowLiveStream(!showLiveStream);
  };

  // The rest of your existing functions
  const destroyPlayer = () => {
    if (flvPlayerRef.current) {
      flvPlayerRef.current.pause()
      flvPlayerRef.current.unload()
      flvPlayerRef.current.detachMediaElement()
      flvPlayerRef.current.destroy()
      flvPlayerRef.current = null
    }
  }
  
  const initializeVideoPlayer = () => {
    // Get stream URL from connection
    const streamUrlData = connectionRef.current.getStreamUrl()
    
    if (!streamUrlData) {
      console.error('No stream URL available')
      setStreamError('No stream URL available for this LIVE')
      setIsLoading(false)
      return
    }
    
    console.log('Initializing video player with URL:', streamUrlData)
    
    // Store available stream qualities
    setStreamUrl(streamUrlData);
    const qualities = Object.keys(streamUrlData);
    setAvailableQualities(qualities);
    
    // Use the first quality option if the default one isn't available
    if (qualities.length > 0 && !streamUrlData[selectedQuality]) {
      setSelectedQuality(qualities[0]);
    }
    
    // Create player with selected quality
    if (flvjs.isSupported() && videoPlayerRef.current) {
      // Destroy existing player if it exists
      destroyPlayer()
      
      // Create new player with the selected quality URL
      if (streamUrlData[selectedQuality]) {
        console.log("Selected quality:", selectedQuality);
        console.log('Creating player with URL:', streamUrlData[selectedQuality]);
        createPlayer(streamUrlData[selectedQuality]);
      } else if (qualities.length > 0) {
        // Fallback to first quality if selected is not available
        createPlayer(streamUrlData[qualities[0]]);
      } else {
        setStreamError('No stream qualities available');
        setIsLoading(false);
      }
    } else {
      console.error('FLV playback is not supported in this browser')
      setStreamError('FLV playback is not supported in this browser')
      setIsLoading(false)
    }
  }
  
  const createPlayer = (url) => {
    console.log('Creating player with URL:', url);
    // Create new player with the stream URL
    const flvPlayer = flvjs.createPlayer({
      type: 'flv',
      url: url,
      isLive: true,
      hasAudio: true,
      hasVideo: true
    })
    
    flvPlayer.attachMediaElement(videoPlayerRef.current)
    flvPlayer.load()
    
    // Handle loading states
    flvPlayer.on('error', (err) => {
      console.error('FLV Player error:', err)
      setStreamError(`Stream error: ${err}`)
      setIsLoading(false)
    })
    
    flvPlayer.on('loading', () => {
      setIsLoading(true)
    })
    
    flvPlayer.on('loaded', () => {
      setIsLoading(false)
    })
    
    // Try to play - may be blocked by browser autoplay policies
    flvPlayer.play().catch(error => {
      console.warn('Auto-play was prevented by the browser. User interaction required:', error)
      setIsLoading(false)
    })
    
    // Handle video loaded event to hide loading indicator
    videoPlayerRef.current.addEventListener('canplay', () => {
      setIsLoading(false)
    })
    
    flvPlayerRef.current = flvPlayer
    setStreamError(null)
  }
  
  const initializeAudioCapture = () => {
    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      // Create source node from video element
      audioSourceRef.current = audioContextRef.current.createMediaElementSource(videoPlayerRef.current);
      
      // Create analyzer node for volume visualization
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      
      // Create gain node for mute control
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 1.0; // Full volume by default
      gainNodeRef.current = gainNode;
      
      // Connect the nodes: source -> analyser -> gain -> destination
      audioSourceRef.current.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      // Store the analyser
      audioAnalyserRef.current = analyser;
      
      // Add event listener to video element to capture mute button clicks
      if (videoPlayerRef.current) {
        videoPlayerRef.current.addEventListener('volumechange', handleVolumeChange);
      }
      
      console.log('Audio capture initialized');
    } catch (error) {
      console.error('Error initializing audio capture:', error);
    }
  };
  
  const handleVolumeChange = () => {
    // Check if video is muted by user
    if (videoPlayerRef.current && videoPlayerRef.current.muted) {
      // Unmute the actual video element (so audio data still flows)
      videoPlayerRef.current.muted = false;
      
      // But set our gain node to 0 (silent)
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = 0;
      }
      
      setIsMuted(true);
    } else if (videoPlayerRef.current && !videoPlayerRef.current.muted && isMuted) {
      // User unmuted, restore volume through gain node
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = videoPlayerRef.current.volume;
      }
      
      setIsMuted(false);
    } else if (videoPlayerRef.current && !videoPlayerRef.current.muted && !isMuted) {
      // Just a volume change, update gain node
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = videoPlayerRef.current.volume;
      }
    }
  };
  
  // Toggle mute function for custom mute button
  const toggleMute = () => {
    if (!videoPlayerRef.current || !gainNodeRef.current) return;
    
    if (isMuted) {
      // Unmute: Restore gain
      gainNodeRef.current.gain.value = videoPlayerRef.current.volume || 1.0;
    } else {
      // Mute: Set gain to 0
      gainNodeRef.current.gain.value = 0;
    }
    
    setIsMuted(!isMuted);
  };
  
  const destroyAudioCapture = () => {
    // Remove event listener
    if (videoPlayerRef.current) {
      videoPlayerRef.current.removeEventListener('volumechange', handleVolumeChange);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
      audioSourceRef.current = null;
      audioAnalyserRef.current = null;
      gainNodeRef.current = null;
    }
  };
  
  // Modified startTranscription to also start recording
  const startTranscription = async () => {
    if (!audioContextRef.current || !audioSourceRef.current || isTranscribing) return;
    
    setIsTranscribing(true);
    setTranscript('');
    setDisplayedTranscript('');
    transcriptChunksRef.current = [];
    
    // Start recording when transcription starts
    await startSyncRecording();
    
    try {
      // Create a script processor node to access audio data
      const bufferSize = 4096;
      const processorNode = audioContextRef.current.createScriptProcessor(
        bufferSize, 1, 1
      );
      
      // Buffer to accumulate audio data before sending
      let audioChunks = [];
      
      // Add variables for silence detection
      let silenceCounter = 0;
      let minChunks = 10; // Minimum audio chunks before considering a cut (~0.7 seconds)
      let maxChunks = 100; // Maximum audio chunks before forced cut (~4 seconds)
      let consecutiveSilenceThreshold = 5; // Number of consecutive silent frames to trigger a cut
      
      processorNode.onaudioprocess = (e) => {
        const audioData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array for compatibility with most APIs
        const pcmData = convertFloat32ToInt16(audioData);
        
        audioChunks.push(pcmData);
        
        // Calculate audio volume/amplitude
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
          sum += Math.abs(audioData[i]);
        }
        const volumeLevel = sum / audioData.length;
        
        // Check if volume is below threshold (silence)
        if (volumeLevel < silenceThreshold && audioChunks.length >= minChunks) {
          silenceCounter++;
        } else {
          silenceCounter = 0;
        }
        
        // Send to OpenAI API if:
        // 1. We detected enough consecutive silent frames after collecting minimum chunks, OR
        // 2. We reached the maximum number of chunks (fallback)
        if ((silenceCounter >= consecutiveSilenceThreshold && audioChunks.length >= minChunks) || 
            audioChunks.length >= maxChunks) {
          const audioBlob = createAudioBlob(audioChunks);
          sendToOpenAI(audioBlob);
          audioChunks = [];
          silenceCounter = 0;
        }
      };
      
      // Connect processor node
      audioSourceRef.current.connect(processorNode);
      processorNode.connect(audioContextRef.current.destination);
      
      audioProcessorRef.current = processorNode;
    } catch (error) {
      console.error('Error starting transcription:', error);
      setIsTranscribing(false);
    }
  };
  
  // New function to start recording for sync purposes
  const startSyncRecording = async () => {
    if (!videoPlayerRef.current || isRecording) return;
    
    try {
      // Create a MediaStream from the video element
      const stream = videoPlayerRef.current.captureStream();
      
      // Determine supported MIME type (try MP4 first, fallback to WebM)
      let mimeType = 'video/mp4';
      let fileExtension = 'mp4';
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        fileExtension = 'webm';
        console.log('MP4 recording not supported by this browser, falling back to WebM');
      }
      
      // Initialize MediaRecorder with the stream
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      // Store file extension for later use
      mediaRecorder.fileExtension = fileExtension;
      
      // Set up event handlers for recording
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          
          // If we're already in delayed playback mode, we might need to update
          if (isPlayingDelayed) {
            pendingChunksRef.current.push(event.data);
          }
        }
      };
      
      // Start recording
      recordedChunksRef.current = [];
      pendingChunksRef.current = [];
      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      
      console.log(`Sync recording started using ${mimeType} format at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error starting sync recording:', error);
    }
  };
  
  // Modified stopTranscription to also stop recording if it was started by transcription
  const stopTranscription = () => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    
    // Stop recording if it was started by transcription
    if (isRecording && isTranscribing) {
      stopRecording(false); // false indicates we don't want to download the video
    }
    
    // Clean up delayed playback
    cleanupDelayedPlayback();
    
    setIsTranscribing(false);
    setShowLiveStream(true);
  };
  
  // Modified sendToOpenAI to store timestamps with transcripts
  const sendToOpenAI = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob);
      formData.append('model', 'whisper-1');
      formData.append('language', 'fr');
      formData.append('prompt', promptList);
      formData.append('response_format', 'json');

      const timestamp = recordingStartTimeRef.current ? 
          Date.now() - recordingStartTimeRef.current : 0;
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.text) {
        // Format text with line breaks
        let formattedText = data.text;
        // formattedText = formattedText.replace(/\./g, '.\n');
        // formattedText = formattedText.replace(/!/g, '!\n');
        // formattedText = formattedText.replace(/\?/g, '?\n');
        // formattedText = formattedText.replace(/,/g, ',\n');
        // formattedText = formattedText.replace(/;/g, ';\n');
        // formattedText = formattedText.replace(/:/g, ':\n');
        
        // Calculate timestamp relative to recording start
        
        
        // Calculate an estimated duration based on the text length
        // Average reading speed is roughly 150 words per minute, or 2.5 words per second
        const wordCount = formattedText.split(/\s+/).length;
        // Adjust duration calculation - slower for French (500ms per word)
        const estimatedDurationMs = Math.max(2000, wordCount * 500); 
        
        // Store the transcript chunk with its timestamp and duration
        const newChunk = {
          text: formattedText,
          timestamp: timestamp,
          endTimestamp: timestamp + estimatedDurationMs,
          duration: estimatedDurationMs,
          words: wordCount,
          receivedAt: Date.now()
        };
        
        transcriptChunksRef.current.push(newChunk);
        
        console.log(`Added transcript at timestamp ${timestamp}ms with duration ${estimatedDurationMs}ms (${wordCount} words): "${formattedText.substring(0, 30)}..."`);
        
        // Update the full transcript for export purposes
        setTranscript(prev => prev + ' ' + formattedText);
      }
    } catch (error) {
      console.error('Error sending audio to OpenAI:', error);
    }
  };
  
  // Modified stopRecording to conditionally download
  const stopRecording = (shouldDownload = true) => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    try {
      // Stop the MediaRecorder
      mediaRecorderRef.current.stop();
      
      // Handle the stop event
      mediaRecorderRef.current.onstop = () => {
        // Get the file extension that was determined during start
        const fileExtension = mediaRecorderRef.current.fileExtension || 'mp4';
        
        // Create a blob from the recorded chunks with the appropriate type
        const mimeType = fileExtension === 'mp4' ? 'video/mp4' : 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        
        if (shouldDownload) {
          // Create a download link for the video
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `tiktok-live-${username}-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.${fileExtension}`;
          
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        }
        
        recordedChunksRef.current = [];
        setIsRecording(false);
        recordingStartTimeRef.current = null;
        console.log(`Recording stopped ${shouldDownload ? 'and downloaded ' : ''}as ${fileExtension}`);
      };
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      recordingStartTimeRef.current = null;
    }
  };
  
  const convertFloat32ToInt16 = (buffer) => {
    const l = buffer.length;
    const buf = new Int16Array(l);
    
    for (let i = 0; i < l; i++) {
      buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 0x7FFF;
    }
    
    return buf;
  };
  
  const createAudioBlob = (chunks) => {
    // Combine all chunks into a single array
    const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
    const combined = new Int16Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Create WAV file
    const wavBuffer = createWAVFile(combined);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };
  
  const createWAVFile = (samples) => {
    const sampleRate = 44100;
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // File length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // Format chunk identifier
    writeString(view, 12, 'fmt ');
    // Format chunk length
    view.setUint32(16, 16, true);
    // Sample format (1 = PCM)
    view.setUint16(20, 1, true);
    // Channels (1 = mono)
    view.setUint16(22, 1, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // Block align (channels * bytes per sample)
    view.setUint16(32, 2, true);
    // Bits per sample
    view.setUint16(34, 16, true);
    // Data chunk identifier
    writeString(view, 36, 'data');
    // Data chunk length
    view.setUint32(40, samples.length * 2, true);
    
    // Write the PCM samples
    const offset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset + i * 2, samples[i], true);
    }
    
    return buffer;
  };
  
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  const exportTranscript = () => {
    if (!transcript) return;
    
    // Create a blob with the transcript text
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
    
    // Append to body, click and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    URL.revokeObjectURL(url);
  };
  
  const startRecording = () => {
    if (!videoPlayerRef.current || !flvPlayerRef.current || isRecording) return;
    
    try {
      // Create a MediaStream from the video element
      const stream = videoPlayerRef.current.captureStream();
      
      // Determine supported MIME type (try MP4 first, fallback to WebM)
      let mimeType = 'video/mp4';
      let fileExtension = 'mp4';
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        fileExtension = 'webm';
        console.log('MP4 recording not supported by this browser, falling back to WebM');
      }
      
      // Initialize MediaRecorder with the stream
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      // Store file extension for later use
      mediaRecorder.fileExtension = fileExtension;
      
      // Set up event handlers for recording
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      // Start recording
      recordedChunksRef.current = [];
      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      console.log(`Recording started using ${mimeType} format`);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };
  
  // Update subtitle timing offset from settings
  const updateSubtitleOffset = (newOffset) => {
    setSubtitleTimingOffset(parseInt(newOffset));
    console.log(`Updated subtitle timing offset to ${newOffset}ms`);
  };
  
  if (!enableFlvStream) {
    return null
  }
  
  return (
    <div className="w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-800 relative">
      {streamError ? (
        <div className="flex flex-col items-center justify-center h-full p-6 text-rose-400 font-medium text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mb-4 text-rose-500/70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>{streamError}</p>
          <button
            className="mt-4 px-4 py-2 bg-rose-500/20 border border-rose-500/30 rounded-lg text-rose-300 hover:bg-rose-500/30 transition-colors"
            onClick={initializeVideoPlayer}
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* Main video display area */}
          
            <video
              ref={videoPlayerRef}
              controls
              autoPlay
              className="w-full h-full rounded-xl"
            />
         
          
          {/* Delayed playback container */}
          <div 
            id="delayed-playback-container" 
            className={showLiveStream ? "hidden" : "block w-full h-full"}
          ></div>

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-gray-600 border-t-pink-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-300 font-medium">
                  Connecting to stream...
                </p>
                <p className="text-xs text-gray-400 mt-2">@{username}</p>
              </div>
            </div>
          )}

          {/* Recording controls */}
          <div className="absolute top-4 left-4 flex gap-2">
          {availableQualities.length > 0 && (
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="bg-black/70 text-white border border-gray-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {availableQualities.map((quality) => (
                <option key={quality} value={quality}>
                  {quality.includes("SD")
                    ? `SD (${quality})`
                    : quality.includes("HD")
                    ? `HD (${quality})`
                    : quality.includes("FULL_HD")
                    ? `Full HD (${quality})`
                    : quality}
                </option>
              ))}
            </select>
            )}
            
            {/* Custom mute button */}
            <button
              onClick={toggleMute}
              className="px-3 py-1 bg-gray-600/80 text-white rounded-lg text-sm hover:bg-gray-600 flex items-center"
              title={isMuted ? "Unmute" : "Mute"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMuted ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    stroke="currentColor"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    stroke="currentColor"
                  />
                )}
              </svg>
              {isMuted ? "Unmute" : "Mute"}
            </button>
            
            {/* Toggle view button (only visible during delayed playback) */}
            {isPlayingDelayed && (
              <button
                onClick={toggleVideoView}
                className="px-3 py-1 bg-green-500/80 text-white rounded-lg text-sm hover:bg-green-500 flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                {showLiveStream ? "Show Synchronized" : "Show Live"}
              </button>
            )}
            
            {/* Only show manual recording button if not already recording for transcription */}
            {!isTranscribing && !isRecording && (
              <button
                onClick={startRecording}
                className="px-3 py-1 bg-red-500/80 text-white rounded-lg text-sm hover:bg-red-500 flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="8" fill="currentColor" />
                </svg>
                Record
              </button>
            )}
            
            {/* Only show stop button for manual recording (not transcription-initiated recording) */}
            {isRecording && !isTranscribing && (
              <button
                onClick={() => stopRecording(true)}
                className="px-3 py-1 bg-gray-600/80 text-white rounded-lg text-sm hover:bg-gray-600 flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <rect
                    x="6"
                    y="6"
                    width="12"
                    height="12"
                    fill="currentColor"
                  />
                </svg>
                Stop & Download
              </button>
            )}

            {/* Reload video button */}
            <button
              onClick={initializeVideoPlayer}
              className="px-3 py-1 bg-blue-500/80 text-white rounded-lg text-sm hover:bg-blue-500 flex items-center"
              title="Reload video stream"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reload
            </button>
          </div>

          {/* Transcription controls */}
          {openaiApiKey && (
            <div className="absolute top-4 right-4 flex gap-2">
              {!isTranscribing ? (
                <div className="flex gap-2 items-center">
                  <button
                    onClick={startTranscription}
                    className="px-3 py-1 bg-pink-500/80 text-white rounded-lg text-sm hover:bg-pink-500"
                  >
                    Start Synchronized Transcription
                  </button>
                  <button
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="px-2 py-1 bg-gray-700/80 text-white rounded-lg text-sm hover:bg-gray-700"
                    title="Transcription Settings"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={stopTranscription}
                  className="px-3 py-1 bg-gray-600/80 text-white rounded-lg text-sm hover:bg-gray-600"
                >
                  Stop Transcription
                </button>
              )}

              {transcript && (
                <button
                  onClick={exportTranscript}
                  className="px-3 py-1 bg-blue-500/80 text-white rounded-lg text-sm hover:bg-blue-500"
                >
                  Export Transcript
                </button>
              )}
            </div>
          )}

          {/* Transcription Settings Panel */}
          {showAdvancedSettings && (
            <div className="absolute top-16 right-4 bg-black/80 p-4 rounded-lg border border-gray-700 z-10 w-64">
              <h3 className="text-white text-sm font-medium mb-2">Transcription Settings</h3>
              <div className="mb-4">
                <label className="text-gray-300 text-xs block mb-1">
                  Silence Threshold: {silenceThreshold.toFixed(3)}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Low</span>
                  <input
                    type="range"
                    min="0.01"
                    max="0.2"
                    step="0.01"
                    value={silenceThreshold}
                    onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-gray-400">High</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  Adjust how sensitive the silence detection is when cutting audio segments
                </p>
              </div>
              <div className="mb-4">
                <label className="text-gray-300 text-xs block mb-1">
                  Subtitle Timing Offset: {subtitleTimingOffset}ms
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Earlier</span>
                  <input
                    type="range"
                    min="-5000"
                    max="5000"
                    step="100"
                    value={subtitleTimingOffset}
                    onChange={(e) => updateSubtitleOffset(e.target.value)}
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-gray-400">Later</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  Fine-tune when subtitles appear (negative = earlier, positive = later)
                </p>
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 text-gray-300 text-xs">
                  <input
                    type="checkbox"
                    checked={showTimingDebug}
                    onChange={() => setShowTimingDebug(!showTimingDebug)}
                    className="h-3 w-3"
                  />
                  Show timing debug information
                </label>
              </div>
              <div className="mb-4">
                <label className="text-gray-300 text-xs block mb-1">
                  Prompt List (Whisper Context)
                </label>
                <textarea
                  value={promptList}
                  onChange={(e) => setPromptList(e.target.value)}
                  placeholder="Add words, names or phrases to help transcription accuracy..."
                  className="w-full p-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-white h-20 resize-none focus:outline-none focus:border-pink-500"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Add specific terms, names or context to improve transcription accuracy
                </p>
              </div>
              <button
                onClick={() => setShowAdvancedSettings(false)}
                className="px-2 py-1 bg-gray-700 text-white rounded-lg text-xs w-full hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          )}

          {/* Debug information overlay */}
          {showTimingDebug && isPlayingDelayed && (
            <div className="absolute top-16 left-4 right-4 bg-black/80 p-3 rounded-lg text-xs text-gray-300 font-mono">
              <div className="font-bold text-pink-500 mb-1">Subtitle Timing Debug</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>Player time: <span className="text-green-400">{currentDebugInfo.playerTimeMs}ms</span></div>
                <div>Adjusted time: <span className="text-blue-400">{currentDebugInfo.adjustedTimeMs}ms</span></div>
                <div>Offset: <span className={currentDebugInfo.offset > 0 ? "text-yellow-400" : "text-purple-400"}>{currentDebugInfo.offset}ms</span></div>
                <div>Chunks: <span className="text-gray-400">{currentDebugInfo.chunksTotal}</span></div>
                <div>Recording: <span className="text-gray-400">{currentDebugInfo.recordingStarted}</span></div>
                <div>Playback: <span className="text-gray-400">{currentDebugInfo.playbackStarted}</span></div>
              </div>
              
              {currentDebugInfo.selectedSubtitle ? (
                <div className="mt-2 border-t border-gray-700 pt-2">
                  <div className="font-bold text-green-500">Current Subtitle</div>
                  <div className="text-white mt-1">"{currentDebugInfo.selectedSubtitle.text}"</div>
                  <div className="flex justify-between mt-1">
                    <div>Start: <span className="text-blue-400">{currentDebugInfo.selectedSubtitle.timestamp}ms</span></div>
                    <div>End: <span className="text-purple-400">{currentDebugInfo.selectedSubtitle.endTimestamp}ms</span></div>
                    <div>Duration: <span className="text-yellow-400">{currentDebugInfo.selectedSubtitle.duration}ms</span></div>
                  </div>
                  <div className="mt-1">
                    <div>Match score: <span className={currentDebugInfo.selectedSubtitle.score < 500 ? "text-green-400" : currentDebugInfo.selectedSubtitle.score < 1000 ? "text-yellow-400" : "text-red-400"}>
                      {currentDebugInfo.selectedSubtitle.score}
                    </span> (lower is better)</div>
                    <div className="w-full bg-gray-700 h-1 mt-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${currentDebugInfo.selectedSubtitle.score < 500 ? "bg-green-500" : currentDebugInfo.selectedSubtitle.score < 1000 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{width: `${Math.max(0, 100 - Math.min(100, currentDebugInfo.selectedSubtitle.score / 20))}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 border-t border-gray-700 pt-2 text-red-400">No active subtitle</div>
              )}
            </div>
          )}

          {/* Volume Viewmeter */}
          {audioAnalyserRef.current && (
            <div className="absolute bottom-20 right-4 w-48">
              <VolumeViewmeter 
                audioAnalyser={audioAnalyserRef.current} 
                isActive={isTranscribing}
                silenceThreshold={silenceThreshold}
              />
            </div>
          )}

          {/* Transcript display with fade effect */}
          {isPlayingDelayed && currentDebugInfo.selectedSubtitle ? (
            <div
              ref={transcriptRef}
              className="absolute bottom-16 left-4 right-4 max-h-32 overflow-y-auto bg-black/70 p-3 rounded-lg text-white text-sm"
            >
              <p className={`whitespace-pre-wrap text-white`}>
                {currentDebugInfo.selectedSubtitle.text ? currentDebugInfo.selectedSubtitle.text : transcript}
              </p>
            </div>
          ) : transcript ? (
            <div
              ref={transcriptRef}
              className="absolute bottom-16 left-4 right-4 max-h-32 overflow-y-auto bg-black/70 p-3 rounded-lg text-white text-sm"
            >
              <p className="whitespace-pre-wrap">{transcript}</p>
            </div>
          ) : null}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-16 left-4 flex items-center bg-black/70 px-3 py-1 rounded-lg">
              <span className="h-3 w-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
              <span className="text-white text-xs">Recording</span>
            </div>
          )}

          {/* Transcription indicator */}
          {isTranscribing && (
            <div className="absolute top-16 right-4 flex items-center bg-black/70 px-3 py-1 rounded-lg">
              <span className="h-3 w-3 bg-pink-500 rounded-full mr-2 animate-pulse"></span>
              <span className="text-white text-xs">{isPlayingDelayed ? "Synchronized Transcription" : "Transcribing (Preparing Sync...)"}</span>
            </div>
          )}

          {/* Delayed playback indicator */}
          {isPlayingDelayed && !showLiveStream && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 flex items-center bg-indigo-500/70 px-3 py-1 rounded-lg">
              <span className="text-white text-xs">Synchronized Playback Mode</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default VideoPlayer 