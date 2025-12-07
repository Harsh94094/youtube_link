// backend/server.js

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 5000;

// SearchAPI.io Configuration
const SEARCHAPI_KEY = 'y7dYPUVEjVs9yiaVcNLxU3de';
const SEARCHAPI_BASE_URL = 'https://www.searchapi.io/api/v1/search';

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  res.json({ message: "Hello World" });
});

// Search API with SearchAPI.io integration
app.get('/api/search', async (req, res) => {
  console.log("✅ Received search request:", req.query);
  
  let query = req.query.q;
  
  if (!query) {
    console.error("❌ Missing query parameter 'q'");
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  console.log(`🔍 Original query: ${query}`);

  // Extract YouTube video ID if present
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;
  const match = query.match(youtubeRegex);
  if (match && match[1]) {
    query = match[1];
    console.log(`🎯 Extracted video ID: ${query}`);
  }

  try {
    // Primary API - SearchAPI.io for YouTube search
    const searchAPIUrl = `${SEARCHAPI_BASE_URL}?engine=youtube&q=${encodeURIComponent(query)}&api_key=${SEARCHAPI_KEY}`;
    console.log(`📡 Calling SearchAPI.io: ${searchAPIUrl.replace(SEARCHAPI_KEY, '***API_KEY***')}`);

    const searchAPIResponse = await fetch(searchAPIUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log(`📥 SearchAPI.io response status: ${searchAPIResponse.status}`);

    if (searchAPIResponse.ok) {
      const searchAPIData = await searchAPIResponse.json();
      console.log("✅ SearchAPI.io data received");

      // Check if we have videos in response
      if (searchAPIData.videos && Array.isArray(searchAPIData.videos) && searchAPIData.videos.length > 0) {
        // Transform SearchAPI.io format to our format
        const videoResults = searchAPIData.videos.map(video => ({
          id: video.id,
          title: video.title,
          thumbnail: video.thumbnail?.static || video.thumbnail?.rich || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
          channel: video.channel?.title || 'Unknown Channel',
          views: video.views || '',
          length: video.length || '',
          published: video.published_time || ''
        }));

        console.log(`✅ Returning ${videoResults.length} videos from SearchAPI.io`);
        return res.json(videoResults);
      }
    }

    // If SearchAPI.io fails, try secondary API
    console.warn("⚠️ SearchAPI.io failed or returned no results. Trying secondary API...");

    // Secondary API - Original ytmp3-tube
    const apiUrl = `https://us-central1-ytmp3-tube.cloudfunctions.net/searchResult?q=${encodeURIComponent(query)}`;
    console.log(`📡 Calling secondary API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Origin': 'http://localhost:3000'
      }
    });

    console.log(`📥 Secondary API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("⚠️ Secondary API error body:", errorText);
      console.warn('⚠️ Secondary API failed. Trying fallback...');

      // Fallback to YouTube Data API v3
      const apiKey = 'AIzaSyBroZLzFmEnzoatDROyaDIMBT-iXk28eLk';
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=5&key=${apiKey}`;
      console.log(`📡 Calling fallback API: ${fallbackUrl}`);

      const fallbackResponse = await fetch(fallbackUrl);
      console.log(`📥 Fallback API response status: ${fallbackResponse.status}`);

      if (!fallbackResponse.ok) {
        const fbErrText = await fallbackResponse.text();
        console.warn("❌ Fallback API error body:", fbErrText);
        throw new Error('All APIs (SearchAPI, Primary, and YouTube) failed');
      }

      const fallbackData = await fallbackResponse.json();
      console.log("✅ Fallback data received:", fallbackData);

      const videoResults = fallbackData.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        channel: item.snippet.channelTitle || 'Unknown Channel',
        views: '',
        length: '',
        published: item.snippet.publishedAt || ''
      }));

      return res.json(videoResults);
    }

    // Success: secondary API worked
    const data = await response.json();
    console.log("✅ Secondary API response received:", data);

    if (Array.isArray(data)) {
      const videoResults = data.map((item) => ({
        id: item.videoId,
        title: item.title,
        thumbnail: item.imgSrc,
        channel: '',
        views: '',
        length: '',
        published: ''
      }));
      return res.json(videoResults);
    } else {
      console.warn("❗ Unexpected format from secondary API:", data);
      return res.status(500).json({ error: 'Unexpected response format from secondary API' });
    }

  } catch (error) {
    console.error("❌ Error in /api/search:", error);
    res.status(500).json({
      error: 'Error fetching search results',
      details: error.message,
      message: 'Please try again later or use a different search term'
    });
  }
});

// MP3 iframe endpoint
app.get('/api/mp3-iframe', (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) {
    return res.status(400).json({ error: 'Query parameter "videoId" is required.' });
  }

  const iframeUrls = [
    `//mp3api.ytjar.info/?id=${videoId}`,
    `//mp3api.ytjar.info/?id=${videoId}&c=FF0000&b=EEEEEE`,
    `//mp3api.ytjar.info/?id=${videoId}&c=FF0000&b=EEEEEE&t`
  ];

  res.json({ iframeUrls });
});

// MP4 iframe endpoint
app.get('/api/mp4-iframe', (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) {
    return res.status(400).json({ error: 'Query parameter "videoId" is required.' });
  }

  const iframeUrls = [
    `//mp4api.ytjar.info/?id=${videoId}`,
    `//mp4api.ytjar.info/?id=${videoId}&c=FF0000&b=EEEEEE&t&h=40px`,
    `//mp4api.ytjar.info/?id=${videoId}&c=FF0000&b=EEEEEE&t&h=40px&cb=FFFFFF&cc=FF0000&br=FF0000`
  ];

  res.json({ iframeUrls });
});

// Download MP3 endpoint
app.get('/api/download-mp3', (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) {
    return res.status(400).json({ error: 'Query parameter "videoId" is required.' });
  }

  console.log(`Backend received download request for video ID: ${videoId}`);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const outputTemplate = path.join(__dirname, 'downloads', '%(title)s.%(ext)s');

  const downloadDir = path.join(__dirname, 'downloads');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
  }

  const ytdlp = spawn('yt-dlp', ['-x', '--audio-format', 'mp3', '-o', outputTemplate, youtubeUrl]);

  let downloadFilePath = null;

  ytdlp.stdout.on('data', (data) => {
    console.log(`yt-dlp stdout: ${data}`);

    const match = data.toString().match(/Destination:\s+(.+)\.mp3/);
    if (match && match[1]) {
      downloadFilePath = `${match[1]}.mp3`;
      console.log(`Detected potential download path: ${downloadFilePath}`);
    }

    const convertingMatch = data.toString().match(/\[ExtractAudio]\s+Destination:\s+(.+)/);
    if (convertingMatch && convertingMatch[1]) {
      downloadFilePath = convertingMatch[1];
      console.log(`Detected conversion destination: ${downloadFilePath}`);
    }
  });

  ytdlp.stderr.on('data', (data) => {
    console.error(`yt-dlp stderr: ${data}`);
  });

  ytdlp.on('error', (error) => {
    console.error(`Failed to start yt-dlp process: ${error}`);

    if (error.code === 'ENOENT') {
      res.status(500).json({ error: 'yt-dlp command not found. Please ensure yt-dlp is installed and in your system\'s PATH.' });
    } else {
      res.status(500).json({ error: 'Failed to start download process.' });
    }
  });

  ytdlp.on('close', (code) => {
    console.log(`yt-dlp process exited with code ${code}`);
    if (code === 0) {
      fs.readdir(downloadDir, (err, files) => {
        if (err) {
          console.error("Error reading download directory:", err);
          return res.status(500).json({ error: 'Error finding downloaded file.' });
        }

        const mp3Files = files.filter(f => f.endsWith('.mp3'));
        if (mp3Files.length > 0) {
          mp3Files.sort((a, b) => {
            const fileA = fs.statSync(path.join(downloadDir, a)).mtime.getTime();
            const fileB = fs.statSync(path.join(downloadDir, b)).mtime.getTime();
            return fileB - fileA;
          });

          const fileToSend = mp3Files[0];
          const filePath = path.join(downloadDir, fileToSend);
          console.log(`Sending file: ${filePath}`);

          res.download(filePath, fileToSend, (err) => {
            if (err) {
              console.error("Error sending file:", err);
              if (!res.headersSent) {
                res.status(500).json({ error: 'Error sending file.' });
              }
            } else {
              console.log("File sent successfully.");
              fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting file:", unlinkErr);
                else console.log("File deleted:", filePath);
              });
            }
          });
        } else {
          console.error("No mp3 file found in download directory after yt-dlp finished.");
          res.status(500).json({ error: 'Downloaded file not found.' });
        }
      });
    } else {
      console.error(`yt-dlp failed with code ${code}`);
      res.status(500).json({ error: `Download and conversion failed with code ${code}.` });
    }
  });
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`API endpoints available at http://localhost:${port}/api/`);
});

