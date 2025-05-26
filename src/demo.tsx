import React, { useState } from 'react';
import AdPortAd from './components/AdPortAd';

interface VideoResult {
  id: string; 
  title: string; 
  thumbnail: string; 
}

function App() {
  const [input, setInput] = useState(''); 
  const [results, setResults] = useState<VideoResult[]>([]); 
  const [loading, setLoading] = useState(false); 
  const [downloading, setDownloading] = useState<string | null>(null);
  const [videoIdForIframe, setVideoIdForIframe] = useState<string | null>(null); 
  const [mp3IframeUrls, setMp3IframeUrls] = useState<string[]>([]);
  const [mp4IframeUrls, setMp4IframeUrls] = useState<string[]>([]);
  const [downloadType, setDownloadType] = useState<'mp3' | 'mp4' | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [mobileLanguageDropdownOpen, setMobileLanguageDropdownOpen] = useState(false);
  const languages = [
    "English",
    "Español",
    "Français",
    "Italiano",
    "Polskie",
    "Deutsch",
    "Magyar",
    "한국의",
    "Indonesia",
    "Nederlands",
    "Türk",
    "Português",
    "日本語"
  ];

  // Theme toggle handler
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[1].length === 11) ? match[1] : null;
  };

  const handleProcessInput = async () => {
    setResults([]);
    setVideoIdForIframe(null);
    setMp3IframeUrls([]);
    setMp4IframeUrls([]);
    setLoading(true);

    const videoId = getYouTubeId(input);

    if (videoId) {
      setVideoIdForIframe(videoId);
      try {
        const mp3Response = await fetch(`https://youtubs.vercel.app/api/mp3-iframe?videoId=${videoId}`);
        if (mp3Response.ok) {
          const mp3Data = await mp3Response.json();
          setMp3IframeUrls(mp3Data.iframeUrls);
        }
        const mp4Response = await fetch(`https://youtubs.vercel.app/api/mp4-iframe?videoId=${videoId}`);
        if (mp4Response.ok) {
          const mp4Data = await mp4Response.json();
          setMp4IframeUrls(mp4Data.iframeUrls);
        }
      } catch (error) {
        console.error("Error fetching iframe URLs:", error);
        alert("Failed to load download options. Please try again.");
      }
      setLoading(false);
    } else if (input.trim()) {
      handleSearch();
    } else {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await fetch(`https://youtubs.vercel.app/api/search?q=${encodeURIComponent(input)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error fetching search results:", error);
      alert("Failed to fetch search results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (videoId: string, videoTitle: string) => {
    setDownloading(videoId);
    try {
      const response = await fetch(`https://youtubs.vercel.app/api/download-mp3?videoId=${encodeURIComponent(videoId)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoTitle}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading video:", error);
      alert(`Failed to download "${videoTitle}". Please try again.`);
    } finally {
      setDownloading(null);
    }
  };

  const handleSearchResultDownloadClick = async (videoId: string, type: 'mp3' | 'mp4') => {
    setVideoIdForIframe(videoId);
    setResults([]);
    setLoading(true);
    setDownloadType(type);

    try {
      if (type === 'mp3') {
        const mp3Response = await fetch(`https://youtubs.vercel.app/api/mp3-iframe?videoId=${videoId}`);
        if (mp3Response.ok) {
          const mp3Data = await mp3Response.json();
          setMp3IframeUrls(mp3Data.iframeUrls);
          setMp4IframeUrls([]); 
        } else {
          throw new Error('Failed to load MP3 download options');
        }
      } else {
        const mp4Response = await fetch(`https://youtubs.vercel.app/api/mp4-iframe?videoId=${videoId}`);
        if (mp4Response.ok) {
          const mp4Data = await mp4Response.json();
          setMp4IframeUrls(mp4Data.iframeUrls);
          setMp3IframeUrls([]);
        } else {
          throw new Error('Failed to load MP4 download options');
        }
      }
    } catch (error) {
      console.error("Error fetching iframe URLs:", error);
      alert(`Failed to load ${type.toUpperCase()} download options. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="bg-gray-800 text-white flex justify-between items-center p-4 relative">
        {/* Logo */}
        <div className="text-2xl font-bold">FLVTO</div>

        {/* Centered Desktop Menu */}
        <div className="hidden md:flex flex-1 justify-center items-center space-x-4">
          <a href="#" className="hover:text-gray-400">SUPPORT</a>
          <a href="#" className="hover:text-gray-400">FOR ADVERTISERS</a>
          <a 
            href="#" 
            className="bg-green-500 text-white font-semibold py-2 px-4 rounded hover:bg-green-600 transition duration-200"
          >
            DOWNLOAD CONVERTER FOR FREE
          </a>
        </div>

        {/* Desktop Language Dropdown */}
        <div className="relative ml-4 hidden md:block">
          <button 
            onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)} 
            className="inline-flex justify-between items-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            <span>Language</span>
            <svg className="ml-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06 0L10 10.5l3.71-3.29a.75.75 0 011.04 1.08l-4.25 3.75a.75.75 0 01-1.04 0l-4.25-3.75a.75.75 0 010-1.08z" clipRule="evenodd" />
            </svg>
          </button>
          {languageDropdownOpen && (
            <ul className="absolute right-0 mt-2 w-48 bg-black text-white rounded-md shadow-lg space-y-1 p-2 z-50">
              {languages.map((lang, index) => (
                <li 
                  key={index}
                  className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
                  onClick={() => setLanguageDropdownOpen(false)}
                >
                  {lang}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Mobile Hamburger */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="md:hidden focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-gray-900 flex flex-col space-y-2 p-4 md:hidden z-50">
            <a href="#" className="hover:text-gray-400">SUPPORT</a>
            <a href="#" className="hover:text-gray-400">FOR ADVERTISERS</a>
            <a 
              href="#" 
              className="bg-green-500 text-white font-semibold py-2 px-4 rounded hover:bg-green-600 transition duration-200"
            >
              DOWNLOAD CONVERTER FOR FREE
            </a>
            <div className="relative">
              <button
                onClick={() => setMobileLanguageDropdownOpen(!mobileLanguageDropdownOpen)}
                className="inline-flex justify-center items-center px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 w-full"
              >
                <span>Language</span>
                <svg className="ml-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06 0L10 10.5l3.71-3.29a.75.75 0 011.04 1.08l-4.25 3.75a.75.75 0 01-1.04 0l-4.25-3.75a.75.75 0 010-1.08z" clipRule="evenodd"/>
                </svg>
              </button>
              {mobileLanguageDropdownOpen && (
                <ul className="absolute left-0 mt-2 w-48 bg-black text-white rounded-md shadow-lg space-y-1 p-2 z-50">
                  {languages.map((lang, index) => (
                    <li
                      key={index}
                      className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
                      onClick={() => setMobileLanguageDropdownOpen(false)}
                    >
                      {lang}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </header>

   <div className={`min-h-screen relative flex flex-col items-center justify-center py-12 px-4 overflow-hidden ${
  isDarkMode 
    ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800' 
    : 'bg-gradient-to-br from-gray-100 via-purple-100 to-violet-200'
}`}>

   {/* Custom Background Images */}
  <img
    src="https://pt.flvto.site/assets/images/left-path.webp"
    alt="YouTube"
    className="absolute left-0 top-1/2 -translate-y-1/2 w-40 z-0"
    style={{ minWidth: 120 }}
  />
  <img
    src="https://pt.flvto.site/assets/images/orange-bg.svg"
    alt="Waveform"
    className="absolute left-1/4 top-1/2 -translate-y-1/2 w-2/4 z-0"
    style={{ minWidth: 400, maxWidth: 700 }}
  />
  <img
    src="https://pt.flvto.site/assets/images/right-path.webp"
    alt="Music Note"
    className="absolute right-0 top-1/2 -translate-y-1/2 w-32 z-0"
    style={{ minWidth: 100 }}
  />
        {/* Animated Background Elements */}
        {/* <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 blur-3xl -top-48 -left-48 animate-blob"></div>
          <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-3xl -bottom-48 -right-48 animate-blob animation-delay-2000"></div>
          <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 blur-3xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-blob animation-delay-4000"></div>
        </div> */}

        {/* Floating Particles */}
        {/* <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 rounded-full ${
                isDarkMode ? 'bg-white/20' : 'bg-gray-800/20'
              }`}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `float ${5 + Math.random() * 10}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`
              }}
            />
          ))}
        </div> */}

       <div className="relative w-full max-w-4xl flex items-center justify-center z-10">
          <div 
            className={`relative z-10 rounded-2xl shadow-2xl p-8 max-w-2xl w-full flex flex-col items-center transition-colors duration-300 backdrop-blur-xl ${
              isDarkMode 
                ? 'bg-white/10 border border-white/20' 
                : 'bg-white/80 border border-gray-200'
            }`}
            style={{ minHeight: '400px' }}
          >
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="absolute top-4 right-4 p-2 rounded-full transition-colors duration-300 hover:bg-opacity-80"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <h2 className={`text-4xl font-extrabold mb-8 text-center bg-clip-text text-transparent ${
              isDarkMode 
                ? 'bg-gradient-to-r from-pink-500 to-violet-500' 
                : 'bg-gradient-to-r from-pink-600 to-violet-600'
            }`}>
              YouTube Utility
            </h2>

            <div className="flex flex-col sm:flex-row gap-4 mb-4 w-full">
              <input
                type="text"
                placeholder="Enter search query or YouTube URL"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className={`flex-grow px-6 py-4 rounded-xl focus:ring-2 outline-none text-lg transition-colors duration-300 ${
                  isDarkMode 
                    ? 'bg-white/10 border border-white/20 text-white placeholder-white/60 focus:ring-pink-500 focus:border-pink-500' 
                    : 'bg-white/80 border border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-violet-500 focus:border-violet-500'
                }`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleProcessInput();
                  }
                }}
              />
              <button
                onClick={handleProcessInput}
                className={`px-8 py-4 text-white font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 focus:ring-pink-500' 
                    : 'bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-700 hover:to-violet-700 focus:ring-violet-500'
                }`}
                disabled={loading || !input.trim()}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : 'Go'}
              </button>
            </div>

            <div className={`text-sm mb-8 ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
              Search Keywords or enter the link to the media
            </div>

            {/* Download/Iframe section */}
            {!loading && videoIdForIframe && (
              <div className="space-y-6 mt-8 w-full">
                <h3 className={`text-2xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {downloadType === 'mp3' ? 'MP3 Download Options' : 
                  downloadType === 'mp4' ? 'MP4 Download Options' : 
                  'Download Options'} for Video ID: {videoIdForIframe}
                </h3>
                
                {mp3IframeUrls.length > 0 && (
                  <div className="space-y-4">
                    <h4 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>MP3 Download Options</h4>
                    {mp3IframeUrls.map((url, index) => (
                      <div key={`mp3-iframe-${index}`} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <iframe
                          src={url}
                          width="100%"
                          height="150"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="rounded-lg"
                        ></iframe>
                      </div>
                    ))}
                  </div>
                )}

                {mp4IframeUrls.length > 0 && (
                  <div className="space-y-4">
                    <h4 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>MP4 Download Options</h4>
                    {mp4IframeUrls.map((url, index) => (
                      <div key={`mp4-iframe-${index}`} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <iframe
                          src={url}
                          width="100%"
                          height="150"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="rounded-lg"
                        ></iframe>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setVideoIdForIframe(null);
                    setMp3IframeUrls([]);
                    setMp4IframeUrls([]);
                    setDownloadType(null);
                  }}
                  className={`mt-6 px-6 py-3 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-white/10 hover:bg-white/20 focus:ring-white/50' 
                      : 'bg-white/80 hover:bg-gray-200 focus:ring-gray-200'
                  }`}
                >
                  Back to Search Results
                </button>
              </div>
            )}

            {/* Search Results section */}
            {!loading && results.length > 0 && !videoIdForIframe && (
              <div className="space-y-6 mt-8 w-full">
                <h3 className={`text-2xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Search Results
                </h3>
                <ul className={`divide-y ${isDarkMode ? 'divide-white/10' : 'divide-gray-200'}`}>
                  {results.map((video) => (
                    <li key={video.id} className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                      <div className="flex items-center mb-4 sm:mb-0 flex-grow mr-4">
                        {video.thumbnail && (
                          <img src={video.thumbnail} alt={video.title} className="w-24 h-24 object-cover rounded-xl mr-4 shadow-lg"/>
                        )}
                        <span className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{video.title}</span>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSearchResultDownloadClick(video.id, 'mp3')}
                          className={`px-6 py-3 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl ${
                            isDarkMode 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500' 
                              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-600'
                          }`}
                        >
                          Download MP3
                        </button>
                        <button
                          onClick={() => handleSearchResultDownloadClick(video.id, 'mp4')}
                          className={`px-6 py-3 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl ${
                            isDarkMode 
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 focus:ring-purple-500' 
                              : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 focus:ring-purple-600'
                          }`}
                        >
                          Download MP4
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No Results/Initial Text */}
            {!loading && results.length === 0 && input.trim() && !videoIdForIframe && (
              <div className={`text-center ${isDarkMode ? 'text-white/80' : 'text-gray-700'} mt-8`}>
                No search results found for "{input}".
              </div>
            )}

            {!loading && results.length === 0 && !input.trim() && !videoIdForIframe && (
              <div className={`mt-8 ${isDarkMode ? 'text-white/90' : 'text-gray-800'} space-y-8 text-center`}>
                <h3 className={`text-3xl font-bold bg-clip-text text-transparent ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-pink-500 to-violet-500' 
                    : 'bg-gradient-to-r from-pink-600 to-violet-600'
                }`}>
                  YouTube to MP3 Converter
                </h3>
                <p className="text-lg leading-relaxed">
                  Looking for the best way to download music from YouTube? Our online YouTube to MP3 converter is fast and free, allowing you to convert and download your favorite YouTube videos to MP3 easily. Accessible on smartphones, PCs, and tablets, our YouTube MP3 converter offers high-quality music up to 320 kbps. Best of all, no app installation required.
                </p>
                <h3 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mt-8`}>
                  How to convert YouTube videos to MP3 online?
                </h3>
                <p className="text-lg">
                  Download MP3 from YouTube in just a few seconds. Follow these simple steps:
                </p>
                <ol className="list-decimal list-inside space-y-4 ml-4 text-left inline-block">
                  <li className="text-lg">Copy the YouTube video URL</li>
                  <li className="text-lg">Paste the link in the search box above</li>
                  <li className="text-lg">Click "Go" and choose your preferred format</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        <style>
          {`
            @keyframes float {
              0% {
                transform: translateY(0) translateX(0);
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
              100% {
                transform: translateY(-100vh) translateX(100px);
                opacity: 0;
              }
            }

            @keyframes blob {
              0% {
                transform: translate(0px, 0px) scale(1);
              }
              33% {
                transform: translate(30px, -50px) scale(1.1);
              }
              66% {
                transform: translate(-20px, 20px) scale(0.9);
              }
              100% {
                transform: translate(0px, 0px) scale(1);
              }
            }

            .animate-blob {
              animation: blob 7s infinite;
            }

            .animation-delay-2000 {
              animation-delay: 2s;
            }

            .animation-delay-4000 {
              animation-delay: 4s;
            }
          `}
        </style>
      </div>
    </>
  );
}

export default App;