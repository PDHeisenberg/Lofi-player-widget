const { google } = require('googleapis');
const tracks = require('../tracks.json');

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

let currentTrackIndex = 0;
let isPlaying = false;
let isMuted = false;
let startTime = Date.now();

exports.handler = async function(event, context) {
  const path = event.path.replace('/.netlify/functions/api/', '');
  const method = event.httpMethod;
  
  console.log(`Received ${method} request for ${path}`);

  try {
    if (path === 'tracks' && method === 'GET') {
      console.log('Returning all tracks');
      return {
        statusCode: 200,
        body: JSON.stringify(tracks)
      };
    }

    if (path === 'currentTrack' && method === 'GET') {
      const track = tracks[currentTrackIndex];
      console.log('Fetching data for track:', track);
      
      const response = await youtube.videos.list({
        part: 'snippet',
        id: track.youtubeId
      });
      
      console.log('YouTube API response:', JSON.stringify(response.data));
      
      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No video data returned from YouTube API');
      }
      
      const videoData = response.data.items[0].snippet;
      return {
        statusCode: 200,
        body: JSON.stringify({
          title: track.title,
          artist: track.artist,
          thumbnail: videoData.thumbnails.default.url,
          youtubeId: track.youtubeId
        })
      };
    }

    if (path === 'togglePlayPause' && method === 'POST') {
      isPlaying = !isPlaying;
      if (isPlaying) {
        startTime = Date.now();
      }
      console.log('Toggled play/pause. isPlaying:', isPlaying);
      return {
        statusCode: 200,
        body: JSON.stringify({ isPlaying })
      };
    }

    if (path === 'toggleMute' && method === 'POST') {
      isMuted = !isMuted;
      console.log('Toggled mute. isMuted:', isMuted);
      return {
        statusCode: 200,
        body: JSON.stringify({ isMuted })
      };
    }

    if (path === 'changeTrack' && method === 'POST') {
      const { direction } = event.queryStringParameters;
      if (direction === 'next') {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
      } else if (direction === 'prev') {
        currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
      }
      startTime = Date.now();
      console.log('Changed track. New index:', currentTrackIndex);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, currentTrackIndex })
      };
    }

    if (path === 'progress' && method === 'GET') {
      if (!isPlaying) {
        return {
          statusCode: 200,
          body: JSON.stringify({ progress: 0 })
        };
      }
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const duration = 180; // Assume 3 minutes per track
      const progress = Math.min((elapsed / duration) * 100, 100);
      return {
        statusCode: 200,
        body: JSON.stringify({ progress })
      };
    }

    console.log('Unknown path:', path);
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not Found' })
    };

  } catch (error) {
    console.error('Error in API function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error.message,
        stack: error.stack
      })
    };
  }
};
