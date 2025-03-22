import React, {useEffect, useRef, useState} from 'react';
import {Play, Pause, Download, Volume2, VolumeX} from 'lucide-react';

const WaveformPlayer = ({audioUrl}) => {
    const canvasRef = useRef(null);
    const audioRef = useRef(null);
    const animationRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [audioContext, setAudioContext] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialize audio context and load audio data
    useEffect(() => {
        if (!audioUrl) return;

        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContext();
        setAudioContext(context);

        // Fetch and decode audio data with enhanced error handling
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                console.log("Fetching audio from:", audioUrl); // Debug log

                const response = await fetch(audioUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'audio/*',
                    },
                    // Add credentials if needed for cross-origin requests
                    credentials: 'include',
                    // Add mode for CORS
                    mode: 'cors',
                });

                if (!response.ok) {
                    console.error("Audio fetch response error:", response.status, response.statusText);
                    throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();

                // Check if arrayBuffer is valid
                if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                    throw new Error("Received empty audio data");
                }

                console.log("Audio data received, size:", arrayBuffer.byteLength); // Debug log

                try {
                    const decodedData = await context.decodeAudioData(arrayBuffer);
                    setAudioBuffer(decodedData);
                    setDuration(decodedData.duration);
                    drawWaveform(decodedData);
                    setIsLoading(false);
                } catch (decodeError) {
                    console.error("Audio decoding error:", decodeError);
                    throw new Error(`Failed to decode audio: ${decodeError.message}`);
                }
            } catch (err) {
                console.error('Error loading audio:', err);
                setError(err.message || "Failed to load audio");
                setIsLoading(false);

                // Fallback to regular audio player if visualization fails
                if (audioRef.current) {
                    audioRef.current.src = audioUrl;
                }
            }
        };

        fetchData();

        return () => {
            if (context && context.state !== 'closed') {
                context.close();
            }
        };
    }, [audioUrl]);

    // Draw the waveform visualization
    const drawWaveform = (buffer) => {
        if (!canvasRef.current || !buffer) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Get dimensions
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get channel data
        const channelData = buffer.getChannelData(0);
        const step = Math.ceil(channelData.length / width);

        // Set styling
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#4F46E5'; // Primary color
        ctx.beginPath();

        // Draw waveform
        for (let i = 0; i < width; i++) {
            const dataIndex = Math.floor(i * step);
            let min = 1.0;
            let max = -1.0;

            // Find min and max in this segment
            for (let j = 0; j < step; j++) {
                const datum = channelData[dataIndex + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }

            // Draw line from min to max
            const y1 = (1 + min) * height / 2;
            const y2 = (1 + max) * height / 2;
            ctx.moveTo(i, y1);
            ctx.lineTo(i, y2);
        }

        ctx.stroke();

        // Draw playback progress gradient overlay
        const drawProgress = (progress) => {
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const playbackPosition = width * progress;

            // Clear progress overlay
            ctx.fillStyle = 'rgba(79, 70, 229, 0.3)'; // Primary color with transparency
            ctx.fillRect(0, 0, playbackPosition, height);
        };

        // Initial progress
        drawProgress(0);

        // Store drawProgress function for animation
        canvas.drawProgress = drawProgress;
    };

    // Handle audio playback
    useEffect(() => {
        if (!audioRef.current) return;

        const audio = audioRef.current;

        // Update time display during playback
        const updateTime = () => {
            setCurrentTime(audio.currentTime);
            if (canvasRef.current && canvasRef.current.drawProgress) {
                canvasRef.current.drawProgress(audio.currentTime / duration);
            }
            animationRef.current = requestAnimationFrame(updateTime);
        };

        // Play/pause handling
        if (isPlaying) {
            audio.play().catch(err => {
                console.error('Error playing audio:', err);
                setIsPlaying(false);
            });
            animationRef.current = requestAnimationFrame(updateTime);
        } else {
            audio.pause();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }

        // Volume handling
        audio.volume = isMuted ? 0 : volume;

        // Clean up
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, volume, isMuted, duration]);

    // Format time in MM:SS format
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle canvas click for seeking
    const handleCanvasClick = (e) => {
        if (!audioRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const seekPosition = (clickX / canvas.width) * duration;

        audioRef.current.currentTime = seekPosition;
        setCurrentTime(seekPosition);

        if (canvasRef.current.drawProgress) {
            canvasRef.current.drawProgress(seekPosition / duration);
        }
    };

    return (
        <div className="bg-dark-800/70 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-pulse text-primary-400">Loading audio...</div>
                </div>
            ) : error ? (
                <div className="text-red-400 py-4 text-center">{error}</div>
            ) : (
                <>
                    {/* Waveform visualization */}
                    <div className="mb-4 relative">
                        <canvas
                            ref={canvasRef}
                            width="600"
                            height="100"
                            className="w-full h-24 bg-dark-700/50 rounded cursor-pointer"
                            onClick={handleCanvasClick}
                        ></canvas>

                        {/* Time indicators */}
                        <div className="flex justify-between mt-1 text-xs text-gray-400">
                            <div>{formatTime(currentTime)}</div>
                            <div>{formatTime(duration)}</div>
                        </div>
                    </div>

                    {/* Audio controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
                            >
                                {isPlaying ? <Pause size={18}/> : <Play size={18}/>}
                            </button>

                            <div className="ml-4 flex items-center">
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className="p-1 text-gray-400 hover:text-white transition-colors"
                                >
                                    {isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                                </button>

                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="ml-2 w-24"
                                />
                            </div>
                        </div>

                        <a
                            href={audioUrl}
                            download="call_recording.wav"
                            className="px-3 py-1.5 bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center"
                        >
                            <Download size={16} className="mr-2"/>
                            Download
                        </a>
                    </div>

                    {/* Hidden audio element */}
                    <audio ref={audioRef} src={audioUrl} preload="auto"></audio>
                </>
            )}
        </div>
    );
};

export default WaveformPlayer;