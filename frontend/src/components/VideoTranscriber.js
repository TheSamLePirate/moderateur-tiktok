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
  
  // New state and refs for synchronized playback
  const playbackVideoRef = useRef(null); // Reference to the playback video element
  const nextPlaybackVideoRef = useRef(null); // Reference to preload the next segment
  const [showPlayback, setShowPlayback] = useState(false); // Control visibility of playback video
  const [currentSegmentUrl, setCurrentSegmentUrl] = useState(null); // Current video segment being played
  const [nextSegmentUrl, setNextSegmentUrl] = useState(null); // Next segment URL to preload
  const [segmentBlobUrls, setSegmentBlobUrls] = useState([]); // Store blob URLs for cleanup
  const videoSegmentsRef = useRef([]); // Store video segments with timestamps
  const [transcriptSegments, setTranscriptSegments] = useState([]); 
  const currentChunkStartTimeRef = useRef(null); // Track when current chunk started
  const recordingStartTimeRef = useRef(null); // Track when recording started
  const [isSyncing, setIsSyncing] = useState(false); // UI indicator for sync happening
  const [showPlaybackControls, setShowPlaybackControls] = useState(false);
  // Add new state to track current segment index for continuous playback
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [isPreloadingNext, setIsPreloadingNext] = useState(false);
  const [playbackTransitioning, setPlaybackTransitioning] = useState(false);

  // Add state to track if playback has failed
  const [playbackFailed, setPlaybackFailed] = useState(false);

  // New state variable for current subtitle text
  const [currentSubtitleText, setCurrentSubtitleText] = useState('');

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

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
        destroyPlayer();
        destroyAudioCapture();
        cleanupSegmentBlobUrls();
      }
    }
    
    return () => {
      destroyPlayer();
      destroyAudioCapture();
      cleanupSegmentBlobUrls();
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
  
  const startTranscription = async () => {
    if (!audioContextRef.current || !audioSourceRef.current || isTranscribing) return;
    
    setIsTranscribing(true);
    setTranscript('');
    
    // Start recording if not already recording
    if (!isRecording) {
      startRecording(true); // true indicates auto-recording mode for transcription
    }
    
    try {
      // Create a script processor node to access audio data
      const bufferSize = 4096;
      const processorNode = audioContextRef.current.createScriptProcessor(
        bufferSize, 1, 1
      );
      
      // Buffer to accumulate audio data before sending
      let audioChunks = [];
      
      // Reset the start time reference for the current chunk
      currentChunkStartTimeRef.current = Date.now();
      
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
          const chunkStartTime = currentChunkStartTimeRef.current;
          const chunkEndTime = Date.now();
          const audioBlob = createAudioBlob(audioChunks);
          
          // Save the timing information for this chunk
          const chunkDuration = {
            startTime: chunkStartTime,
            endTime: chunkEndTime,
            relativeStart: chunkStartTime - (recordingStartTimeRef.current || chunkStartTime),
            relativeEnd: chunkEndTime - (recordingStartTimeRef.current || chunkStartTime)
          };
          
          sendToOpenAI(audioBlob, chunkDuration);
          
          // Reset for next chunk
          audioChunks = [];
          silenceCounter = 0;
          currentChunkStartTimeRef.current = Date.now();
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
  
  const stopTranscription = () => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    
    // Don't automatically stop recording - let the user decide
    setIsTranscribing(false);
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
  
  const sendToOpenAI = async (audioBlob, chunkTiming) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob);
      formData.append('model', 'whisper-1');
      formData.append('language', 'fr');
      formData.append('prompt', promptList);
      formData.append('response_format', 'json');
      
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
        const formattedText = formatTranscriptText(data.text);
        
        // Create a unique ID for this transcript segment
        const segmentId = `segment-${Date.now()}`;
        
        // Update transcript state with the new segment
        setTranscript(prev => prev + ' ' + formattedText);
        
        // Add to transcript segments for better UI tracking
        const newSegment = {
          id: segmentId,
          text: formattedText,
          timing: chunkTiming
        };
        
        setTranscriptSegments(prev => [...prev, newSegment]);
        
        // Set current subtitle text to this new segment
        setCurrentSubtitleText(formattedText);
        
        // Find video segments that overlap with this audio chunk's time range
        // Only trigger video playback if we're not already showing a direct capture
        if (!showPlayback) {
          findAndPlayMatchingVideoSegment(chunkTiming);
        } else {
          // If we're already showing direct playback, just update the subtitle without changing the video
          console.log("Direct playback active, updating subtitle only:", formattedText.substring(0, 50) + (formattedText.length > 50 ? "..." : ""));
        }
      }
    } catch (error) {
      console.error('Error sending audio to OpenAI:', error);
    }
  };
  
  // Helper function to format transcript text
  const formatTranscriptText = (text) => {
    // Add line breaks after punctuation
    text = text.replace(/\./g, '.\n');
    text = text.replace(/!/g, '!\n');
    text = text.replace(/\?/g, '?\n');
    text = text.replace(/,/g, ',\n');
    text = text.replace(/;/g, ';\n');
    text = text.replace(/:/g, ':\n');
    return text;
  };
  
  // Add a helper function to find the most relevant transcript for a specific time range
  const findRelevantTranscript = (startTime, endTime) => {
    if (transcriptSegments.length === 0) return null;
    
    console.log(`Finding relevant transcript for time range: ${startTime} - ${endTime}`);
    
    // First try: look for direct overlaps
    const overlappingSegments = transcriptSegments.filter(segment => {
      return (segment.timing.startTime <= endTime && segment.timing.endTime >= startTime);
    });
    
    if (overlappingSegments.length > 0) {
      // Sort by temporal proximity (center of the segment)
      const midTime = (startTime + endTime) / 2;
      overlappingSegments.sort((a, b) => {
        const aMid = (a.timing.startTime + a.timing.endTime) / 2;
        const bMid = (b.timing.startTime + b.timing.endTime) / 2;
        return Math.abs(aMid - midTime) - Math.abs(bMid - midTime);
      });
      
      console.log(`Found ${overlappingSegments.length} matching segments, using closest match:`, 
        overlappingSegments[0].text.substring(0, 40) + (overlappingSegments[0].text.length > 40 ? '...' : ''));
      return overlappingSegments[0];
    }
    
    // Second try: find closest segments
    const sortedByProximity = [...transcriptSegments].sort((a, b) => {
      // Calculate proximity - how close each segment is to our target time range
      const aEndDiff = Math.abs(a.timing.endTime - startTime);
      const aStartDiff = Math.abs(a.timing.startTime - endTime);
      const aProximity = Math.min(aEndDiff, aStartDiff);
      
      const bEndDiff = Math.abs(b.timing.endTime - startTime);
      const bStartDiff = Math.abs(b.timing.startTime - endTime);
      const bProximity = Math.min(bEndDiff, bStartDiff);
      
      return aProximity - bProximity;
    });
    
    if (sortedByProximity.length > 0) {
      // Get closest segment
      const closestSegment = sortedByProximity[0];
      // Only use if it's relatively close (within 5 seconds)
      const proximity = Math.min(
        Math.abs(closestSegment.timing.endTime - startTime),
        Math.abs(closestSegment.timing.startTime - endTime)
      );
      
      if (proximity < 5000) {
        console.log(`Found closest segment within ${proximity}ms:`, 
          closestSegment.text.substring(0, 40) + (closestSegment.text.length > 40 ? '...' : ''));
        return closestSegment;
      }
    }
    
    // If still no good match, use the most recent transcript as a fallback
    console.log(`No matching segments found, using most recent transcript`);
    return transcriptSegments[transcriptSegments.length - 1];
  };

  // Modify the directPlayback function to use the relevant transcript
  const directPlayback = () => {
    try {
      // Check if we have the main video reference
      if (!videoPlayerRef.current) {
        alert("Main video player not available");
        return;
      }

      console.log("Starting direct playback capture...");
      
      // Get current timestamp for finding relevant transcript
      const now = Date.now();
      const captureStartTime = now - 8000; // 8 seconds ago (matches our capture duration)
      
      // Get the most temporally relevant transcript segment
      if (transcriptSegments.length > 0) {
        const relevantSegment = findRelevantTranscript(captureStartTime, now);
        if (relevantSegment) {
          setCurrentSubtitleText(relevantSegment.text);
          console.log("Using matched transcript for caption:", relevantSegment.text.substring(0, 50) + (relevantSegment.text.length > 50 ? "..." : ""));
        } else {
          setCurrentSubtitleText("Direct playback - no matching transcript");
        }
      } else {
        // Fall back to generic message only if no transcript is available
        setCurrentSubtitleText("Direct playback - waiting for transcript");
      }
      
      // Capture the current stream directly from the video element
      const stream = videoPlayerRef.current.captureStream();
      
      // Create a new MediaRecorder to capture the current stream with higher quality
      const mimeType = 'video/webm';
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 5000000 // 5 Mbps for better quality
      });
      
      // Array to store captured chunks
      const directChunks = [];
      
      // Set up data available handler
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          directChunks.push(event.data);
        }
      };
      
      // When recording stops, create and play the video
      recorder.onstop = () => {
        console.log(`Direct capture complete with ${directChunks.length} chunks`);
        
        if (directChunks.length === 0) {
          alert("No video data captured");
          return;
        }
        
        // Create a blob and URL
        const blob = new Blob(directChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        console.log("Created direct playback URL:", url);
        
        // Update state to show the playback
        setSegmentBlobUrls(prev => [...prev, url]);
        setCurrentSegmentUrl(url);
        setShowPlayback(true);
        setShowPlaybackControls(false);
        
        // Try to play the video immediately
        setTimeout(() => {
          if (playbackVideoRef.current) {
            playbackVideoRef.current.src = url;
            playbackVideoRef.current.load();
            playbackVideoRef.current.play().catch(e => {
              console.error("Failed to autoplay direct capture:", e);
              setShowPlaybackControls(true);
            });
          }
        }, 100);
      };
      
      // Start recording with smaller slices for smoother gathering
      recorder.start(100);
      
      // Increase capture duration to 8 seconds for better context
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 8000);
      
      console.log("Capturing 8 seconds of video...");
      
    } catch (error) {
      console.error("Direct playback error:", error);
      alert(`Direct playback failed: ${error.message}`);
    }
  };

  // Add a function to preload the next segment
  const preloadNextSegment = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= transcriptSegments.length) {
      console.log("No valid next segment to preload");
      return;
    }
    
    console.log(`Preloading next segment (${nextIndex})`);
    setIsPreloadingNext(true);
    
    const nextSegment = transcriptSegments[nextIndex];
    
    // Find matching video segments for the next transcript segment
    if (videoSegmentsRef.current.length > 0) {
      // Extend timing window for smoother transitions - increased overlap
      const extendedTiming = {
        startTime: nextSegment.timing.startTime - 3000,     // Look 3 seconds earlier
        endTime: nextSegment.timing.endTime + 3000,         // Look 3 seconds later
        relativeStart: nextSegment.timing.relativeStart - 3000,
        relativeEnd: nextSegment.timing.relativeEnd + 3000
      };
      
      const matchingSegments = videoSegmentsRef.current.filter(segment => {
        const segmentEndTime = segment.timestamp + segment.duration;
        const matches = (
          (segment.timestamp >= extendedTiming.startTime && segment.timestamp <= extendedTiming.endTime) ||
          (segmentEndTime >= extendedTiming.startTime && segmentEndTime <= extendedTiming.endTime) ||
          (segment.timestamp <= extendedTiming.startTime && segmentEndTime >= extendedTiming.endTime)
        );
        return matches;
      });
      
      let segmentsToUse = matchingSegments;
      if (matchingSegments.length === 0) {
        // Use more segments for smoother playback - increased from 5 to 8
        const count = Math.min(8, videoSegmentsRef.current.length);
        segmentsToUse = videoSegmentsRef.current.slice(-count);
      } else {
        // Sort by timestamp
        segmentsToUse = [...matchingSegments].sort((a, b) => a.timestamp - b.timestamp);
      }
      
      if (segmentsToUse.length > 0) {
        // Add buffer segments if available
        let finalSegmentsToUse = [...segmentsToUse];
        
        if (videoSegmentsRef.current.length > segmentsToUse.length) {
          const firstSegmentIdx = videoSegmentsRef.current.findIndex(
            segment => segment.timestamp === segmentsToUse[0].timestamp
          );
          
          const lastSegmentIdx = videoSegmentsRef.current.findIndex(
            segment => segment.timestamp === segmentsToUse[segmentsToUse.length - 1].timestamp
          );
          
          // Add TWO segments before if available for better lead-in
          if (firstSegmentIdx > 1) {
            finalSegmentsToUse.unshift(videoSegmentsRef.current[firstSegmentIdx - 1]);
            finalSegmentsToUse.unshift(videoSegmentsRef.current[firstSegmentIdx - 2]);
          } else if (firstSegmentIdx > 0) {
            finalSegmentsToUse.unshift(videoSegmentsRef.current[firstSegmentIdx - 1]);
          }
          
          // Add TWO segments after if available for better continuation
          if (lastSegmentIdx < videoSegmentsRef.current.length - 2) {
            finalSegmentsToUse.push(videoSegmentsRef.current[lastSegmentIdx + 1]);
            finalSegmentsToUse.push(videoSegmentsRef.current[lastSegmentIdx + 2]);
          } else if (lastSegmentIdx < videoSegmentsRef.current.length - 1) {
            finalSegmentsToUse.push(videoSegmentsRef.current[lastSegmentIdx + 1]);
          }
        }
        
        // Create blob for the next segment
        const mimeType = mediaRecorderRef.current?.fileExtension === 'mp4' ? 'video/mp4' : 'video/webm';
        const segmentBlob = new Blob(
          finalSegmentsToUse.map(segment => segment.chunk),
          { type: mimeType }
        );
        
        try {
          // Create and store the URL for the next segment
          const url = URL.createObjectURL(segmentBlob);
          setSegmentBlobUrls(prevUrls => [...prevUrls, url]);
          setNextSegmentUrl(url);
          
          // If we have a next video element, preload the next segment
          if (nextPlaybackVideoRef.current) {
            nextPlaybackVideoRef.current.src = url;
            nextPlaybackVideoRef.current.load();
            console.log(`Next segment preloaded: ${finalSegmentsToUse.length} segments, ${segmentBlob.size} bytes`);
          }
        } catch (e) {
          console.error("Error preloading next segment:", e);
        }
      }
    }
    
    setIsPreloadingNext(false);
  };

  // Enhanced event handler for segment ended to make transitions smoother
  const handleSegmentEnded = () => {
    console.log("Segment playback ended");
    
    // Only attempt to play next segment if we're in an active transcription session
    if (!isTranscribing || !isRecording) {
      console.log("Not in active transcription session, not playing next segment");
      setShowPlayback(false);
      return;
    }
    
    // Check if we have a next segment to play
    if (currentSegmentIndex >= 0 && currentSegmentIndex < transcriptSegments.length - 1) {
      const nextIndex = currentSegmentIndex + 1;
      console.log(`Moving to next segment ${nextIndex} of ${transcriptSegments.length}`);
      
      // Set subtitle text for the next segment
      if (transcriptSegments[nextIndex]) {
        setCurrentSubtitleText(transcriptSegments[nextIndex].text);
      }
      
      if (nextSegmentUrl && nextPlaybackVideoRef.current) {
        // We have a preloaded segment, use it for smooth transition
        setPlaybackTransitioning(true);
        
        // Update the current segment index and URL
        setCurrentSegmentIndex(nextIndex);
        
        // Swap the current segment with the preloaded one
        const currentVideo = playbackVideoRef.current;
        const nextVideo = nextPlaybackVideoRef.current;
        
        // Start crossfade transition - start playing next video before fading out current
        if (nextVideo) {
          // Start playing the next video immediately, keeping current one visible
          nextVideo.style.opacity = 0; // Start invisible
          nextVideo.play().catch(error => {
            console.warn('Next segment autoplay failed:', error);
            setShowPlaybackControls(true);
          });
          
          // Once next video is playing, begin crossfade
          setTimeout(() => {
            // Fade in next video while current is still playing
            if (nextVideo) nextVideo.style.opacity = 1;
            // Gradually fade out current video
            if (currentVideo) currentVideo.style.opacity = 0;
          }, 100);
        }
        
        // Swap references and update state
        const tempRef = playbackVideoRef;
        playbackVideoRef.current = nextPlaybackVideoRef.current;
        nextPlaybackVideoRef.current = tempRef.current;
        
        // Update URL state
        setCurrentSegmentUrl(nextSegmentUrl);
        setNextSegmentUrl(null);
        
        // Preload the segment after the next one
        if (nextIndex < transcriptSegments.length - 1) {
          setTimeout(() => preloadNextSegment(nextIndex + 1), 300); // Start preloading sooner
        }
        
        // Finish transition
        setTimeout(() => {
          setPlaybackTransitioning(false);
        }, 500);
      } else {
        // No preloaded segment, fall back to regular playback
        const nextSegment = transcriptSegments[nextIndex];
        findAndPlayMatchingVideoSegment(nextSegment.timing, nextIndex);
        
        // Try to preload the segment after this one
        if (nextIndex < transcriptSegments.length - 1) {
          setTimeout(() => preloadNextSegment(nextIndex + 1), 300);
        }
      }
    } else {
      console.log("No more segments to play or invalid index");
      // We're at the end of segments or have an invalid index, hide playback
      setShowPlayback(false);
    }
  };

  // Modify findAndPlayMatchingVideoSegment to ensure correct subtitle
  const findAndPlayMatchingVideoSegment = (chunkTiming, segmentIndex = -1) => {
    console.log("=== FINDING MATCHING SEGMENTS ===");
    console.log("Current state:", {
      recordingActive: isRecording,
      segmentsCount: videoSegmentsRef.current.length,
      currentSegmentUrl: !!currentSegmentUrl,
      showPlayback,
      recordingStartTime: recordingStartTimeRef.current,
      segmentIndex
    });
    
    // Update current segment index - this helps with continuous playback
    if (segmentIndex >= 0) {
      setCurrentSegmentIndex(segmentIndex);
      // Use the exact segment for the subtitle text, not just by index
      if (transcriptSegments[segmentIndex]) {
        setCurrentSubtitleText(transcriptSegments[segmentIndex].text);
        console.log(`Using segment ${segmentIndex} transcript:`, transcriptSegments[segmentIndex].text.substring(0, 40) + '...');
      }
    } else if (segmentIndex === -1) {
      // When called from sendToOpenAI, this is the latest segment
      setCurrentSegmentIndex(transcriptSegments.length - 1);
      
      // Get the specific transcript segment for this timing
      const relevantSegment = findRelevantTranscript(chunkTiming.startTime, chunkTiming.endTime);
      if (relevantSegment) {
        setCurrentSubtitleText(relevantSegment.text);
      } else if (transcriptSegments.length > 0) {
        // Fall back to the most recent
        setCurrentSubtitleText(transcriptSegments[transcriptSegments.length - 1].text);
      }
    }
    
    // If no segments are available but we have a recording in progress, 
    // create a segment from the current video
    if (!videoSegmentsRef.current.length && videoPlayerRef.current) {
      console.log("No recorded segments, but will try to capture current video");
      directPlayback();
      return;
    }
    
    if (!isRecording) {
      console.log("Not currently recording, aborting segment matching");
      return;
    }
    
    console.log("Finding matching segments for timing:", chunkTiming);
    console.log("Total available segments:", videoSegmentsRef.current.length);
    
    if (videoSegmentsRef.current.length > 0) {
      console.log("First segment timestamp:", videoSegmentsRef.current[0].timestamp);
      console.log("Last segment timestamp:", videoSegmentsRef.current[videoSegmentsRef.current.length-1].timestamp);
    }
    
    // If we have segments but timing info doesn't match, just use the most recent segments
    let segmentsToUse = [];
    
    if (videoSegmentsRef.current.length > 0) {
      // Extend the search window much further to ensure greater overlap
      const extendedTiming = {
        startTime: chunkTiming.startTime - 3000, // Look 3 seconds earlier (increased from 1.5s)
        endTime: chunkTiming.endTime + 3000,     // Look 3 seconds later (increased from 1.5s)
        relativeStart: chunkTiming.relativeStart - 3000,
        relativeEnd: chunkTiming.relativeEnd + 3000
      };
      
      // Try to find matching segments first with extended window
      const matchingSegments = videoSegmentsRef.current.filter(segment => {
        // Check if the segment overlaps with the chunk timing
        const segmentEndTime = segment.timestamp + segment.duration;
        const matches = (
          (segment.timestamp >= extendedTiming.startTime && segment.timestamp <= extendedTiming.endTime) ||
          (segmentEndTime >= extendedTiming.startTime && segmentEndTime <= extendedTiming.endTime) ||
          (segment.timestamp <= extendedTiming.startTime && segmentEndTime >= extendedTiming.endTime)
        );
        return matches;
      });
      
      console.log(`Found ${matchingSegments.length} matching segments out of ${videoSegmentsRef.current.length} total`);
      
      // If no matches found, fall back to recent segments
      if (matchingSegments.length === 0) {
        console.log("No matching segments found, falling back to recent segments");
        // Use more segments for longer, smoother playback - increased from 5 to 8
        const count = Math.min(8, videoSegmentsRef.current.length);
        segmentsToUse = videoSegmentsRef.current.slice(-count);
      } else {
        // Sort segments by timestamp to ensure proper sequence
        const sortedSegments = [...matchingSegments].sort((a, b) => a.timestamp - b.timestamp);
        segmentsToUse = sortedSegments;
      }
    }
    
    if (segmentsToUse.length > 0) {
      // Indicate syncing is happening
      setIsSyncing(true);
      
      // Create a blob from the segments
      const mimeType = mediaRecorderRef.current?.fileExtension === 'mp4' ? 'video/mp4' : 'video/webm';
      
      // Add a larger buffer on either side of the segment for maximum overlap
      let finalSegmentsToUse = [...segmentsToUse];
      
      // If we have more segments available, try to add context before and after
      if (videoSegmentsRef.current.length > segmentsToUse.length) {
        const firstSegmentIdx = videoSegmentsRef.current.findIndex(
          segment => segment.timestamp === segmentsToUse[0].timestamp
        );
        
        const lastSegmentIdx = videoSegmentsRef.current.findIndex(
          segment => segment.timestamp === segmentsToUse[segmentsToUse.length - 1].timestamp
        );
        
        // Add TWO segments before if available for better lead-in
        if (firstSegmentIdx > 1) {
          finalSegmentsToUse.unshift(videoSegmentsRef.current[firstSegmentIdx - 1]);
          finalSegmentsToUse.unshift(videoSegmentsRef.current[firstSegmentIdx - 2]);
        } else if (firstSegmentIdx > 0) {
          finalSegmentsToUse.unshift(videoSegmentsRef.current[firstSegmentIdx - 1]);
        }
        
        // Add TWO segments after if available for better continuation
        if (lastSegmentIdx < videoSegmentsRef.current.length - 2) {
          finalSegmentsToUse.push(videoSegmentsRef.current[lastSegmentIdx + 1]);
          finalSegmentsToUse.push(videoSegmentsRef.current[lastSegmentIdx + 2]);
        } else if (lastSegmentIdx < videoSegmentsRef.current.length - 1) {
          finalSegmentsToUse.push(videoSegmentsRef.current[lastSegmentIdx + 1]);
        }
      }
      
      // Now create a combined blob from all these segments
      const segmentBlob = new Blob(
        finalSegmentsToUse.map(segment => segment.chunk),
        { type: mimeType }
      );
      
      console.log(`Created blob of size: ${segmentBlob.size} bytes from ${finalSegmentsToUse.length} segments`);
      
      try {
        // Create a URL for the new blob
        const url = URL.createObjectURL(segmentBlob);
        console.log("Created new playback URL:", url);
        
        // Store the URL for cleanup later
        setSegmentBlobUrls(prevUrls => [...prevUrls, url]);
        
        // First set the URL then make playback visible
        setCurrentSegmentUrl(url);
        setShowPlayback(true);
        setShowPlaybackControls(false);
        
        console.log("Set playback visible with URL");
        
        // After a short delay, set syncing to false
        setTimeout(() => {
          setIsSyncing(false);
          
          // Double check settings
          console.log("After playback setup:", { 
            currentUrl: !!currentSegmentUrl, 
            showPlayback, 
            playbackRef: !!playbackVideoRef.current,
            segmentIndex: currentSegmentIndex,
            segmentSize: segmentBlob.size,
            segmentCount: finalSegmentsToUse.length
          });
          
          // Preload next segment if available
          if (segmentIndex >= 0 && segmentIndex < transcriptSegments.length - 1) {
            preloadNextSegment(segmentIndex + 1);
          }
        }, 1000);
      } catch (e) {
        console.error("Error creating/setting URL:", e);
      }
    } else {
      console.log("No segments to use, trying direct capture");
      directPlayback();
    }
  };
  
  // Function to clean up blob URLs when component unmounts or recording stops
  const cleanupSegmentBlobUrls = () => {
    segmentBlobUrls.forEach(url => {
      URL.revokeObjectURL(url);
    });
    setSegmentBlobUrls([]);
    setCurrentSegmentUrl(null);
    setShowPlayback(false);
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
  
  const startRecording = (isAutoRecording = false) => {
    if (!videoPlayerRef.current || !flvPlayerRef.current || isRecording) return;
    
    try {
      // Set the recording start time
      recordingStartTimeRef.current = Date.now();
      
      // Reset video segments
      if (!isAutoRecording) {
        videoSegmentsRef.current = [];
        setTranscriptSegments([]);
      }
      
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
      
      // Initialize MediaRecorder with the stream - increased bitrate for better quality
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 5000000 // 5 Mbps for better quality
      });
      
      // Store file extension for later use
      mediaRecorder.fileExtension = fileExtension;
      
      // Set up event handlers for recording
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          const chunk = event.data;
          recordedChunksRef.current.push(chunk);
          
          // Store the current timestamp for each chunk
          const timestamp = Date.now();
          const relativeTimestamp = timestamp - recordingStartTimeRef.current;
          
          // Create a video segment entry with timing information
          // Using 2-second chunks with a 2.5-second duration creates a 0.5s overlap between chunks
          videoSegmentsRef.current.push({
            chunk: chunk,
            timestamp: timestamp,
            relativeTimestamp: relativeTimestamp,
            duration: 2500, // Each chunk represents 2.5 seconds even though collected every 2s
          });
        }
      };
      
      // Start recording with smaller time slices (2 seconds) for more overlap between chunks
      recordedChunksRef.current = [];
      mediaRecorder.start(2000); // Collect data every 2 seconds but mark as 2.5s duration for overlap
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      console.log(`Recording started using ${mimeType} format with 2s chunks (marked as 2.5s for overlap)`);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };
  
  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    try {
      // Stop the MediaRecorder
      mediaRecorderRef.current.stop();
      
      // Handle the stop event to download the recording
      mediaRecorderRef.current.onstop = () => {
        // Get the file extension that was determined during start
        const fileExtension = mediaRecorderRef.current.fileExtension || 'mp4';
        
        // Create a blob from the recorded chunks with the appropriate type
        const mimeType = fileExtension === 'mp4' ? 'video/mp4' : 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        
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
        
        recordedChunksRef.current = [];
        setIsRecording(false);
        cleanupSegmentBlobUrls();
        console.log(`Recording stopped and downloaded as ${fileExtension}`);
      };
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      cleanupSegmentBlobUrls();
    }
  };
  
  // Update useEffect for component unmount
  useEffect(() => {
    return () => {
      // Clean up all resources when component unmounts
      if (isRecording) {
        try {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        } catch (error) {
          console.error('Error stopping MediaRecorder on unmount:', error);
        }
      }
      
      if (isTranscribing) {
        stopTranscription();
      }
      
      cleanupSegmentBlobUrls();
    };
  }, [isRecording, isTranscribing]);

  // Add a function to start both recording and transcription together
  const startSynchronizedMode = () => {
    if (isRecording || isTranscribing) return;
    
    // Start recording first
    startRecording(true);
    
    // Then start transcription (which will use the recording)
    setTimeout(() => {
      startTranscription();
    }, 500); // Small delay to ensure recording is initialized
  };

  // Add a function to stop both recording and transcription
  const stopSynchronizedMode = () => {
    stopTranscription();
    
    // Small delay to ensure transcription is stopped properly
    setTimeout(() => {
      stopRecording();
    }, 500);
  };
  
  // Enhanced playback function with more robust error handling
  const playSegmentVideo = () => {
    if (playbackVideoRef.current && currentSegmentUrl) {
      // Reset error states
      setPlaybackFailed(false);
      console.log("Attempting to play video from URL:", currentSegmentUrl);
      
      try {
        // Reset the source to ensure it's fresh
        playbackVideoRef.current.src = currentSegmentUrl;
        playbackVideoRef.current.load();
        
        // Set focus to the video element to improve autoplay chances
        playbackVideoRef.current.focus();
        
        // Try to play with error handling
        const playPromise = playbackVideoRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Playback started successfully');
              setShowPlaybackControls(false);
            })
            .catch(error => {
              console.warn('Playback failed:', error);
              setShowPlaybackControls(true);
              setPlaybackFailed(true);
            });
        } else {
          // Older browsers might not return a promise
          console.log('Browser did not return play promise, assuming playback started');
          setShowPlaybackControls(false);
        }
      } catch (error) {
        console.error('Error setting up video playback:', error);
        setPlaybackFailed(true);
        setShowPlaybackControls(true);
      }
    } else {
      console.warn('Cannot play: video element or URL is missing', { 
        videoRef: !!playbackVideoRef.current, 
        url: currentSegmentUrl 
      });
    }
  };

  // Add a test function to simulate getting a transcript segment
  const testPlaybackVideo = () => {
    if (!isRecording) {
      alert('Please start recording first');
      return;
    }
    
    // Use the most recent video segments to create a test playback
    if (videoSegmentsRef.current.length > 0) {
      // Get the last 3 segments or fewer if not enough
      const segmentCount = Math.min(3, videoSegmentsRef.current.length);
      const recentSegments = videoSegmentsRef.current.slice(-segmentCount);
      
      // Create fake timing info
      const now = Date.now();
      const fakeChunkTiming = {
        startTime: now - 3000,
        endTime: now,
        relativeStart: (recordingStartTimeRef.current) ? (now - 3000 - recordingStartTimeRef.current) : 0,
        relativeEnd: (recordingStartTimeRef.current) ? (now - recordingStartTimeRef.current) : 3000
      };
      
      // Trigger the same function that's called when transcript segments arrive
      findAndPlayMatchingVideoSegment(fakeChunkTiming);
      
      // Show a message
      console.log("Test playback triggered with segments:", recentSegments.length);
    } else {
      alert('No recorded segments available yet. Keep recording for a few seconds and try again.');
    }
  };
  
  // Add a debug button directly under the test playback button to forcefully test the playback mechanism
  const forcePlaybackTest = () => {
    if (!isRecording || recordedChunksRef.current.length === 0) {
      alert('Please start recording first and wait for at least one chunk');
      return;
    }
    
    try {
      // Get all available chunks
      const chunks = [...recordedChunksRef.current];
      console.log(`Force test with ${chunks.length} chunks`);
      
      // Create a blob directly
      const mimeType = mediaRecorderRef.current.fileExtension === 'mp4' ? 'video/mp4' : 'video/webm';
      const segmentBlob = new Blob(chunks, { type: mimeType });
      
      // Create URL
      const url = URL.createObjectURL(segmentBlob);
      console.log("Force created URL:", url);
      
      // Show specific debugging for each step
      console.log("Before setting state:", {
        currentSegmentUrl,
        showPlayback,
        videoSegmentsCount: videoSegmentsRef.current.length,
        recordedChunksCount: recordedChunksRef.current.length
      });
      
      // Store URL and set states directly
      setSegmentBlobUrls(prev => [...prev, url]);
      setCurrentSegmentUrl(url);
      setShowPlayback(true);
      setShowPlaybackControls(false);
      
      // Alert user
      console.log("FORCE TEST: Playback URL created and visibility set to true");
      
      setTimeout(() => {
        // Check if everything was set correctly
        console.log("After states set:", {
          currentUrl: currentSegmentUrl, 
          showPlayback,
          playbackVideoRef: !!playbackVideoRef.current
        });
      }, 500);
    } catch (error) {
      console.error("Force playback test failed:", error);
      alert(`Test failed: ${error.message}`);
    }
  };
  
  // Enhance the useEffect for playback
  useEffect(() => {
    if (currentSegmentUrl && playbackVideoRef.current) {
      // Small delay to ensure the video element is properly initialized
      const timer = setTimeout(() => {
        playSegmentVideo();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentSegmentUrl]);
  
  // Add this effect to properly clean up URLs
  useEffect(() => {
    return () => {
      // Cleanup function to ensure all blob URLs are revoked when component unmounts
      if (segmentBlobUrls.length > 0) {
        segmentBlobUrls.forEach(url => {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error("Error revoking URL:", e);
          }
        });
      }
    };
  }, [segmentBlobUrls]);
  
  // Add an effect to update subtitles when direct playback is active
  useEffect(() => {
    // When a new transcript segment is added during direct playback, update the subtitle
    const handleNewTranscript = () => {
      if (showPlayback && transcriptSegments.length > 0) {
        const latestSegment = transcriptSegments[transcriptSegments.length - 1];
        setCurrentSubtitleText(latestSegment.text);
      }
    };

    // Set up this effect when direct playback is active and we have transcripts
    if (showPlayback && transcriptSegments.length > 0) {
      handleNewTranscript();
    }
  }, [showPlayback, transcriptSegments.length]);
  
  // Add handler for time update on playback video to keep subtitles in sync
  const handlePlaybackTimeUpdate = (e) => {
    // Only run this if we have the video element with timing data
    if (!playbackVideoRef.current || 
        !playbackVideoRef.current.dataset.segmentStartTime || 
        !playbackVideoRef.current.dataset.segmentEndTime) {
      return;
    }
    
    // Get the current playback position as a percentage
    const duration = playbackVideoRef.current.duration;
    const currentTime = playbackVideoRef.current.currentTime;
    if (!duration || currentTime === undefined) return;
    
    const percentage = currentTime / duration;
    
    // Calculate the actual timestamp based on the segment timing and current position
    const segmentStartTime = parseInt(playbackVideoRef.current.dataset.segmentStartTime, 10);
    const segmentEndTime = parseInt(playbackVideoRef.current.dataset.segmentEndTime, 10);
    const estimatedTime = segmentStartTime + (segmentEndTime - segmentStartTime) * percentage;
    
    // Find the most relevant transcript for this point in the video
    const windowStart = estimatedTime - 1500; // 1.5 second window
    const windowEnd = estimatedTime + 1500;  
    
    const currentSegment = findRelevantTranscript(windowStart, windowEnd);
    if (currentSegment && currentSegment.text !== currentSubtitleText) {
      setCurrentSubtitleText(currentSegment.text);
    }
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
          {/* Main video player */}
          <video
            ref={videoPlayerRef}
            controls
            autoPlay
            className="w-full h-full rounded-xl"
          />

          {/* Debug indicator for playback state */}
          {isRecording && isTranscribing && (
            <div className="absolute top-28 left-1/2 transform -translate-x-1/2 flex flex-col items-center bg-black/70 px-3 py-2 rounded-lg text-white text-xs">
              <div className="flex items-center mb-1">
                <span className="h-2 w-2 mr-1 rounded-full" style={{ backgroundColor: showPlayback ? '#10B981' : '#EF4444' }}></span>
                <span>Playback Visibility: {showPlayback ? 'ON' : 'OFF'}</span>
              </div>
              <div className="flex items-center">
                <span className="h-2 w-2 mr-1 rounded-full" style={{ backgroundColor: currentSegmentUrl ? '#10B981' : '#EF4444' }}></span>
                <span>Segment URL: {currentSegmentUrl ? 'Available' : 'None'}</span>
              </div>
            </div>
          )}

          {/* Playback video for transcript sync - more visible position and style */}
          {showPlayback && currentSegmentUrl && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-54 bg-black border-4 border-pink-500 rounded-lg overflow-hidden shadow-lg z-30">
              {/* Main playback video - visible */}
              <div className="relative w-full h-full">
                <video
                  ref={playbackVideoRef}
                  src={currentSegmentUrl}
                  autoPlay
                  muted={false}
                  playsInline
                  controls={true}
                  className="w-full h-full transition-opacity duration-300"
                  onEnded={handleSegmentEnded}
                  onTimeUpdate={handlePlaybackTimeUpdate}
                  style={{ opacity: playbackTransitioning ? 0 : 1 }}
                />
                
                {/* Hidden next segment video for preloading */}
                <video
                  ref={nextPlaybackVideoRef}
                  src={nextSegmentUrl}
                  playsInline
                  muted={true}
                  preload="auto" 
                  className="absolute top-0 left-0 w-full h-full transition-opacity duration-300"
                  style={{ opacity: playbackTransitioning ? 1 : 0 }}
                />
                
                {/* Enhanced subtitle overlay with better styling and readability */}
                {currentSubtitleText && (
                  <div className="absolute bottom-14 left-0 right-0 px-3 py-2 z-10">
                    <div className="bg-black/90 p-3 rounded-lg text-center border border-pink-400/50 shadow-lg max-h-32 overflow-y-auto">
                      <p className="text-white text-sm font-medium leading-relaxed">
                        {currentSubtitleText}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Playback UI elements */}
              {showPlaybackControls && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
                  onClick={playSegmentVideo}
                >
                  <div className="bg-white/20 rounded-full p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              )}
              
              <div className="absolute top-0 left-0 bg-pink-500 text-white text-xs px-2 py-1 rounded-br-lg">
                Transcript Playback
              </div>
              
              {/* Loading indicator */}
              {isPreloadingNext && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg flex items-center">
                  <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Preloading
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 flex justify-between bg-black/70 px-2 py-1">
                {playbackFailed && (
                  <button
                    onClick={playSegmentVideo}
                    className="text-xs text-white flex items-center"
                    title="Retry playback"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry
                  </button>
                )}
                <div className="text-xs text-white mx-2">
                  {currentSegmentIndex >= 0 ? `Segment ${currentSegmentIndex + 1}/${transcriptSegments.length}` : ''}
                  {nextSegmentUrl && " (Next Ready)"}
                </div>
                <button
                  onClick={() => setShowPlayback(false)}
                  className="ml-auto text-xs text-white"
                  title="Close playback"
                >
                  Close
                </button>
              </div>
            </div>
          )}

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
            
            {!isRecording ? (
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
            ) : (
              <button
                onClick={stopRecording}
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

          {/* Test buttons for playback */}
          {isRecording && (
            <div className="absolute top-16 left-4 flex gap-2">
              <button
                onClick={testPlaybackVideo}
                className="px-3 py-1 bg-yellow-500/80 text-white rounded-lg text-sm hover:bg-yellow-500 flex items-center"
                title="Test playback with recent recording segments"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Test Playback
              </button>
              
              <button
                onClick={forcePlaybackTest}
                className="px-3 py-1 bg-purple-500/80 text-white rounded-lg text-sm hover:bg-purple-500 flex items-center"
                title="Force test playback by directly creating a video segment"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Force Play
              </button>
              
              <button
                onClick={directPlayback}
                className="px-3 py-1 bg-green-500/80 text-white rounded-lg text-sm hover:bg-green-500 flex items-center"
                title="Capture current video with most recent transcript as subtitles"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Capture with Subtitle
              </button>
            </div>
          )}

          {/* Transcription controls */}
          {openaiApiKey && (
            <div className="absolute top-4 right-4 flex gap-2">
              {!isTranscribing ? (
                <div className="flex gap-2 items-center">
                  {!isRecording ? (
                    <button
                      onClick={startSynchronizedMode}
                      className="px-3 py-1 bg-green-500/80 text-white rounded-lg text-sm hover:bg-green-500 flex items-center"
                      title="Start synchronized recording and transcription"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Start Sync Mode
                    </button>
                  ) : (
                    <button
                      onClick={startTranscription}
                      className="px-3 py-1 bg-pink-500/80 text-white rounded-lg text-sm hover:bg-pink-500"
                    >
                      Start Transcription
                    </button>
                  )}
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
                  onClick={isRecording ? stopSynchronizedMode : stopTranscription}
                  className="px-3 py-1 bg-gray-600/80 text-white rounded-lg text-sm hover:bg-gray-600"
                >
                  {isRecording ? "Stop Sync Mode" : "Stop Transcription"}
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

          {/* Transcript display with active segment highlighting */}
          {transcript && (
            <div
              ref={transcriptRef}
              className="absolute bottom-16 left-4 right-4 max-h-32 overflow-y-auto bg-black/70 p-3 rounded-lg text-white text-sm"
            >
              {/* Main transcript */}
              <p className="whitespace-pre-wrap">{transcript}</p>
              
              {/* Recent transcript segments for debugging */}
              {transcriptSegments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                  <p className="font-medium mb-1">Recent segments:</p>
                  <div className="max-h-16 overflow-y-auto">
                    {transcriptSegments.slice(-3).map((segment, index) => (
                      <div 
                        key={segment.id} 
                        className={`mb-1 ${currentSubtitleText === segment.text ? 'bg-pink-900/30 border-l-2 border-pink-500 pl-1 rounded' : ''}`}
                      >
                        <span className="text-gray-500">{index + 1}. </span>
                        <span>{segment.text.substring(0, 40)}{segment.text.length > 40 ? '...' : ''} </span>
                        <span className="text-gray-500 text-xs">
                          {Math.round(segment.timing.relativeEnd / 1000)}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sync indicator */}
              {isSyncing && (
                <div className="absolute top-1 right-1 flex items-center bg-green-500/80 px-2 py-0.5 rounded text-xs text-white animate-pulse">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  Syncing
                </div>
              )}
            </div>
          )}

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
              <span className="text-white text-xs">Transcribing</span>
            </div>
          )}

          {/* Add transcription and playback state indicator */}
          {isTranscribing && isRecording && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 flex items-center bg-black/70 px-3 py-1 rounded-lg">
              <span className="h-3 w-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              <span className="text-white text-xs">Synchronized Recording</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default VideoPlayer 