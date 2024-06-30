document.addEventListener('DOMContentLoaded', () => {
    const trackName = document.getElementById('track-name');
    const artistName = document.getElementById('artist-name');
    const thumbnail = document.getElementById('thumbnail');
    const playPauseBtn = document.getElementById('play-pause');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const muteBtn = document.getElementById('mute');
    const progressBar = document.querySelector('.progress');

    let isPlaying = false;
    let isMuted = false;
    let currentTrackIndex = 0;

    function updateTrackInfo() {
        fetch('/api/currentTrack')
            .then(response => response.json())
            .then(data => {
                trackName.textContent = data.title;
                artistName.textContent = data.artist;
                thumbnail.src = data.thumbnail;
            })
            .catch(error => console.error('Error:', error));
    }

    function togglePlayPause() {
        isPlaying = !isPlaying;
        playPauseBtn.textContent = isPlaying ? '⏸️' : '▶️';
        fetch('/api/togglePlayPause', { method: 'POST' })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
    }

    function toggleMute() {
        isMuted = !isMuted;
        muteBtn.textContent = isMuted ? '🔈' : '🔇';
        fetch('/api/toggleMute', { method: 'POST' })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
    }

    function changeTrack(direction) {
        fetch(`/api/changeTrack?direction=${direction}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                updateTrackInfo();
                console.log(data);
            })
            .catch(error => console.error('Error:', error));
    }

    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', () => changeTrack('prev'));
    nextBtn.addEventListener('click', () => changeTrack('next'));
    muteBtn.addEventListener('click', toggleMute);

    // Update progress bar
    setInterval(() => {
        if (isPlaying) {
            fetch('/api/progress')
                .then(response => response.json())
                .then(data => {
                    progressBar.style.width = `${data.progress}%`;
                })
                .catch(error => console.error('Error:', error));
        }
    }, 1000);

    updateTrackInfo();
});