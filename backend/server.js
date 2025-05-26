// backend/server.js

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000; 


app.use(cors());
app.use(express.json()); 




app.get('/',async(req,res)=>{
  res.json({message:"Hello World"})
})

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  console.log(`Backend received search query: ${query}`);

  try {
   
    const apiUrl = `https://us-central1-ytmp3-tube.cloudfunctions.net/searchResult?q=${encodeURIComponent(query)}`;
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'http://localhost:3000'
      }
    });

    if (!response.ok) {

      console.log('Primary API failed, trying fallback...');
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${process.env.YOUTUBE_API_KEY}`;
      const fallbackResponse = await fetch(fallbackUrl);

      if (!fallbackResponse.ok) {
        throw new Error('Both primary and fallback APIs failed');
      }

      const fallbackData = await fallbackResponse.json();
      const videoResults = fallbackData.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url
      }));
      return res.json(videoResults);
    }

    const data = await response.json();

    
    if (Array.isArray(data)) {
      const videoResults = data.map((item) => ({
        id: item.videoId,
        title: item.title,
        thumbnail: item.imgSrc
      }));
      res.json(videoResults);
    } else {
      console.warn("External API response was not an array:", data);
      res.status(500).json({ error: 'Unexpected response format from external search API' });
    }

  } catch (error) {
    console.error("Error in backend search endpoint:", error);
    res.status(500).json({ 
      error: 'Error fetching search results',
      details: error.message,
      message: 'Please try again later or use a different search term'
    });
  }
});


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


app.get('/api/download-mp3', (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) {
    return res.status(400).json({ error: 'Query parameter "videoId" is required.' });
  }

  console.log(`Backend received download request for video ID: ${videoId}`);


  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const outputTemplate = path.join(__dirname, 'downloads', '%(title)s.%(ext)s'); 


  const downloadDir = path.join(__dirname, 'downloads');
  if (!fs.existsSync(downloadDir)){
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
});