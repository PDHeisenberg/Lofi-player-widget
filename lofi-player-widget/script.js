let player;
let currentTrackIndex = 0;
let tracks = [];

// Load tracks from configuration
fetch('tracks.json')
    .then(response => response.json())
    .then(data => {
        tracks = data;
        loadTrack(currentTrackIndex);
    });

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '0',
        width: '0',
        videoId: tracks[currentTrackIndex].youtubeId,
        playerVars: {
            'playsinline': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    updatePlayerInfo();
    setInterval(updateProgressBar, 1000);
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        nextTrack();
    }
}

function loadTrack(index) {
    player.loadVideoById(tracks[index].youtubeId);
    updatePlayerInfo();
}

function updatePlayerInfo() {
    document.getElementById('track-name').textContent = tracks[currentTrackIndex].title;
    document.getElementById('artist-name').textContent = tracks[currentTrackIndex].artist;
    document.getElementById('thumbnail').src = `https://img.youtube.com/vi/${tracks[currentTrackIndex].youtubeId}/0.jpg`;
}

function updateProgressBar() {
    if (player && player.getCurrentTime) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        const progressPercent = (currentTime / duration) * 100;
        document.getElementById('progress').style.width = `${progressPercent}%`;
    }
}

document.getElementById('play-pause-button').addEventListener('click', () => {
    if (player.getPlayerState() == YT.PlayerState.PLAYING) {
        player.pauseVideo();
        document.getElementById('play-pause-button').textContent = '►';
    } else {
        player.playVideo();
        document.getElementById('play-pause-button').textContent = '❚❚';
    }
});

document.getElementById('next-button').addEventListener('click', nextTrack);
document.getElementById('prev-button').addEventListener('click', prevTrack);

function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(currentTrackIndex);
}

function prevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentTrackIndex);
}

document.getElementById('volume-button').addEventListener('click', () => {
    if (player.isMuted()) {
        player.unMute();
        document.getElementById('volume-button').textContent = '🔊';
    } else {
        player.mute();
        document.getElementById('volume-button').textContent = '🔇';
    }
});
