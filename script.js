let player;
let currentTrackIndex = 0;
let tracks = [];
let isPlaying = false;
let lastTrackChangeTime = 0;
const TRACK_CHANGE_COOLDOWN = 5000; // 5 seconds cooldown
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const API_RATE_LIMIT = 10; // 10 requests per minute
let apiRequestsCount = 0;
let apiRequestsResetTime = Date.now();

function resetApiRequestsCount() {
    const now = Date.now();
    if (now - apiRequestsResetTime >= 60000) {
        apiRequestsCount = 0;
        apiRequestsResetTime = now;
    }
}

function canMakeApiRequest() {
    resetApiRequestsCount();
    return apiRequestsCount < API_RATE_LIMIT;
}

function makeApiRequest(url, options = {}) {
    if (!canMakeApiRequest()) {
        console.log('API rate limit reached. Waiting...');
        return new Promise(resolve => setTimeout(() => resolve(makeApiRequest(url, options)), 60000 / API_RATE_LIMIT));
    }
    apiRequestsCount++;
    return fetch(url, options);
}

// Load tracks from configuration
makeApiRequest('/.netlify/functions/api/tracks')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Tracks loaded:', data);
        tracks = data;
        loadTrackWithCache(currentTrackIndex);
    })
    .catch(error => console.error('Error loading tracks:', error));

function onYouTubeIframeAPIReady() {
    console.log('YouTube API is ready');
    player = new YT.Player('player', {
        height: '0',
        width: '0',
        videoId: '',
        playerVars: {
            'playsinline': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    console.log('Player is ready');
    loadTrackWithCache(currentTrackIndex);
    setInterval(updateProgressBar, 1000); // Update every second
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        console.log('Track ended, playing next');
        nextTrack();
    } else if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayPauseButton();
    } else if (event.data == YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayPauseButton();
    }
}

function onPlayerError(event) {
    console.error('Player error:', event.data);
    nextTrack(); // Skip to next track on error
}

function loadTrackWithCache(index) {
    const cachedTrack = getCachedTrack(index);
    if (cachedTrack) {
        console.log('Loading cached track:', cachedTrack);
        updatePlayerWithTrack(cachedTrack);
    } else {
        console.log('Fetching track from API');
        fetchTrackWithRetry(index);
    }
}

function getCachedTrack(index) {
    const cachedData = localStorage.getItem(`track_${index}`);
    if (cachedData) {
        const { track, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return track;
        }
    }
    return null;
}

function setCachedTrack(index, track) {
    localStorage.setItem(`track_${index}`, JSON.stringify({
        track,
        timestamp: Date.now()
    }));
}

function fetchTrackWithRetry(index, retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    makeApiRequest(`/.netlify/functions/api/currentTrack`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(track => {
            console.log('Current track data:', track);
            setCachedTrack(index, track);
            updatePlayerWithTrack(track);
        })
        .catch(error => {
            console.error('Error loading track:', error);
            if (retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount);
                console.log(`Retrying in ${delay}ms...`);
                setTimeout(() => fetchTrackWithRetry(index, retryCount + 1), delay);
            } else {
                console.error('Max retries reached. Skipping to next track.');
                nextTrack();
            }
        });
}

function updatePlayerWithTrack(track) {
    player.loadVideoById(track.youtubeId);
    updatePlayerInfo(track);
}

function updatePlayerInfo(track) {
    console.log('Updating player info:', track);
    const trackNameElement = document.getElementById('track-name');
    const artistNameElement = document.getElementById('artist-name');
    const thumbnailElement = document.getElementById('thumbnail');

    if (trackNameElement) trackNameElement.textContent = track.title;
    if (artistNameElement) artistNameElement.textContent = track.artist;
    if (thumbnailElement) thumbnailElement.src = track.thumbnail;
}

const progressBar = document.querySelector('.progress-bar');
const progress = document.querySelector('.progress');

if (progressBar) {
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        player.seekTo(pos * player.getDuration());
        updateProgressBar();
    });
}

function updateProgressBar() {
    if (player && player.getCurrentTime && player.getDuration) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        if (duration > 0) {
            const progressPercent = (currentTime / duration) * 100;
            if (progress) progress.style.width = `${progressPercent}%`;
        }
    }
}

function updatePlayPauseButton() {
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    
    if (playIcon && pauseIcon) {
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }
}

document.getElementById('play-pause')?.addEventListener('click', () => {
    console.log('Play/Pause clicked');
    if (isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
    makeApiRequest('/.netlify/functions/api/togglePlayPause', { method: 'POST' })
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
});

document.getElementById('next')?.addEventListener('click', nextTrack);
document.getElementById('prev')?.addEventListener('click', prevTrack);

function nextTrack() {
    changeTrack('next');
}

function prevTrack() {
    changeTrack('prev');
}

function changeTrack(direction) {
    const now = Date.now();
    if (now - lastTrackChangeTime < TRACK_CHANGE_COOLDOWN) {
        console.log('Track change too soon, ignoring');
        return;
    }
    
    lastTrackChangeTime = now;
    console.log(`Changing track: ${direction}`);
    
    if (direction === 'next') {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    } else if (direction === 'prev') {
        currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    }
    
    loadTrackWithCache(currentTrackIndex);
    
    makeApiRequest(`/.netlify/functions/api/changeTrack?direction=${direction}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
}

document.getElementById('mute')?.addEventListener('click', () => {
    console.log('Mute/Unmute clicked');
    if (player.isMuted()) {
        player.unMute();
        document.getElementById('volume-icon').style.display = 'block';
        document.getElementById('mute-icon').style.display = 'none';
    } else {
        player.mute();
        document.getElementById('volume-icon').style.display = 'none';
        document.getElementById('mute-icon').style.display = 'block';
    }
    makeApiRequest('/.netlify/functions/api/toggleMute', { method: 'POST' })
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
});

// Initial setup
updatePlayPauseButton();
