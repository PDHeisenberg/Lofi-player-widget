let player;
let currentTrackIndex = 0;
let tracks = [];
let isPlaying = false;

// Load tracks from configuration
fetch('/.netlify/functions/api/tracks')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Tracks loaded:', data);
        tracks = data;
        loadTrack(currentTrackIndex);
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
    loadTrack(currentTrackIndex);
    setInterval(updateProgressBar, 1000);
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

function loadTrack(index) {
    console.log('Loading track at index:', index);
    fetch(`/.netlify/functions/api/currentTrack`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(track => {
            console.log('Current track data:', track);
            player.loadVideoById(track.youtubeId);
            updatePlayerInfo(track);
        })
        .catch(error => {
            console.error('Error loading track:', error);
            nextTrack(); // Try next track if current one fails
        });
}

function updatePlayerInfo(track) {
    console.log('Updating player info:', track);
    document.getElementById('track-name').textContent = track.title;
    document.getElementById('artist-name').textContent = track.artist;
    document.getElementById('thumbnail').src = track.thumbnail;
}

function updateProgressBar() {
    if (player && player.getCurrentTime && isPlaying) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        const progressPercent = (currentTime / duration) * 100;
        document.querySelector('.progress').style.width = `${progressPercent}%`;
    }
}

function updatePlayPauseButton() {
    const playPauseBtn = document.getElementById('play-pause');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'inline';
    } else {
        playIcon.style.display = 'inline';
        pauseIcon.style.display = 'none';
    }
}

document.getElementById('play-pause').addEventListener('click', () => {
    console.log('Play/Pause clicked');
    if (isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
    fetch('/.netlify/functions/api/togglePlayPause', { method: 'POST' })
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
});

document.getElementById('next').addEventListener('click', nextTrack);
document.getElementById('prev').addEventListener('click', prevTrack);

function nextTrack() {
    console.log('Next track');
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(currentTrackIndex);
    fetch('/.netlify/functions/api/changeTrack?direction=next', { method: 'POST' })
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
}

function prevTrack() {
    console.log('Previous track');
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentTrackIndex);
    fetch('/.netlify/functions/api/changeTrack?direction=prev', { method: 'POST' })
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
}

document.getElementById('mute').addEventListener('click', () => {
    console.log('Mute/Unmute clicked');
    if (player.isMuted()) {
        player.unMute();
        document.getElementById('volume-icon').style.display = 'inline';
        document.getElementById('mute-icon').style.display = 'none';
    } else {
        player.mute();
        document.getElementById('volume-icon').style.display = 'none';
        document.getElementById('mute-icon').style.display = 'inline';
    }
    fetch('/.netlify/functions/api/toggleMute', { method: 'POST' })
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
});

// Initial setup
updatePlayPauseButton();
