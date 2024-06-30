require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('.'));

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

let currentTrackIndex = 0;
let tracks = require('./tracks.json');
let isPlaying = false;
let isMuted = false;
let startTime = Date.now();

app.get('/api/currentTrack', async (req, res) => {
  try {
    const track = tracks[currentTrackIndex];
    const response = await youtube.videos.list({
      part: 'snippet',
      id: track.youtubeId
    });
    const videoData = response.data.items[0].snippet;
    res.json({
      title: track.title,
      artist: track.artist,
      thumbnail: videoData.thumbnails.default.url
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

app.post('/api/togglePlayPause', (req, res) => {
  isPlaying = !isPlaying;
  if (isPlaying) {
    startTime = Date.now();
  }
  res.json({ isPlaying });
});

app.post('/api/toggleMute', (req, res) => {
  isMuted = !isMuted;
  res.json({ isMuted });
});

app.post('/api/changeTrack', (req, res) => {
  const { direction } = req.query;
  if (direction === 'next') {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
  } else if (direction === 'prev') {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
  }
  startTime = Date.now();
  res.json({ success: true });
});

app.get('/api/progress', (req, res) => {
  if (!isPlaying) {
    res.json({ progress: 0 });
    return;
  }
  const elapsed = (Date.now() - startTime) / 1000; // seconds
  const duration = 180; // Assume 3 minutes per track
  const progress = Math.min((elapsed / duration) * 100, 100);
  res.json({ progress });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});