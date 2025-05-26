import React, { useState, useEffect } from 'react';
import './App.css';

type VideoResult = {
  id: string;
  title: string;
  thumbnail: string;
};

const App = () => {
  // --- State ---
  const [input, setInput] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [videoIdForIframe, setVideoIdForIframe] = useState<string | null>(null);
  const [mp3IframeUrls, setMp3IframeUrls] = useState<string[]>([]);
  const [mp4IframeUrls, setMp4IframeUrls] = useState<string[]>([]);
  const [downloadType, setDownloadType] = useState<'mp3' | 'mp4' | null>(null);
  const [showShareBar, setShowShareBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isDesktop = window.innerWidth >= 768;
      const atBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 10;
      if (isDesktop) {
        setShowShareBar(atBottom);
      } else {
        setShowShareBar(true); // Always show on mobile
      }
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // --- Helpers ---
  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[1].length === 11) ? match[1] : null;
  };

  const handleProcessInput = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setResults([]);
    setMp3IframeUrls([]);
    setMp4IframeUrls([]);
    setVideoIdForIframe(null);

    const videoId = getYouTubeId(input.trim());
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
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch(`https://youtubs.vercel.app/api/search?q=${encodeURIComponent(input)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
    <div className="bg-white m-0 p-0 font-sans">
      {/* Top bar */}
      <header className="bg-[#3f3a36] flex justify-between items-center px-6 py-4">
        <div className="text-[#cfcfcf] font-condensed text-xl tracking-widest select-none">
          FLVTO
        </div>
        <button
          aria-label="Language selector"
          className="flex items-center gap-2 border border-[#cfcfcf] rounded px-3 py-1 text-[#cfcfcf] text-sm"
        >
          <i className="fas fa-globe"></i>
          <i className="fas fa-chevron-down text-xs"></i>
        </button>
      </header>

      {/* Main content */}
   
<main className="bg-[#faf5ee] flex flex-col items-center min-h-[20vh] py-0 md:py-16 relative overflow-x-hidden">

        {/* Top orange input section */}
        <div className="w-full flex justify-center items-center relative">
          {/* Left wave SVG - only on md+ */}
          <div className="left-red-icon-container absolute left-28 top-1/2 -translate-y-1/2 hidden md:block">
            <img
              alt="Left red waveform shape from flvto.nu"
              className="bg-svg-left ml-8"
              src="https://flvto.nu/_next/static/media/left-path.2fcbc824.svg"
            />
          </div>
          {/* Orange background for mobile (sm and below) */}
          <div className="absolute inset-0 bg-[#FF9A1A] rounded-lg md:hidden z-0" />
          <div className="orange-bg-container relative flex flex-col items-center justify-center p-8 z-10">
            {/* Orange SVG background - only on md+ */}
            <img
              alt="Orange background shape from flvto.nu"
              className="bg-svg absolute inset-0 w-full h-full object-cover z-0 hidden md:block"
              src="https://flvto.nu/_next/static/media/orange-bg.07f06725.svg"
            />
            <form
              className="relative z-10 w-full flex flex-col items-center"
              onSubmit={handleProcessInput}
            >
              <input
                type="text"
                placeholder="Enter the link to the media"
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-96 max-w-full px-3 py-2 text-gray-600 text-lg rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f88c1a] bg-white bg-opacity-90"
              />
              <div className="flex items-center gap-1 text-xs font-bold text-[#f3f3f3] mb-2 mt-2">
                <span>🔗</span>
                <span>Search Keywords or enter the link to the media</span>
              </div>
              <button
                type="submit"
                className="mt-2 bg-[#d94a22] border-2 border-black text-white font-bold text-base uppercase rounded py-2 hover:bg-[#c03f1a] transition w-96 max-w-full"
                disabled={loading}
              >
                {loading ? "Processing..." : "CONVERT"}
              </button>
              <p className="text-[10px] text-white mt-2">
                By using our service you agree to our Terms of Use
              </p>
            </form>
          </div>
          {/* Right wave SVG - only on md+ */}
          <div className="right-red-icon-container absolute right-28 top-1/2 -translate-y-1/2 hidden md:block">
            <img
              alt="Right red waveform shape from flvto.nu"
              className="bg-svg-right mr-8"
              src="https://flvto.nu/_next/static/media/right-path.fb5a2100.svg"
              style={{ width: '210px', height: '100px' }}
            />
          </div>
        </div>

        {/* Results section below orange-bg-container */}
        {results.length > 0 && (
          <div className="w-full bg-white py-10 mt-0 flex flex-wrap justify-center gap-8">
            {results.map((video) => (
              <div key={video.id} className="flex flex-col items-center w-60">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-32 object-cover rounded"
                />
                <div className="font-bold text-sm text-black text-center mt-2 mb-1 leading-tight">
                  {video.title}
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-green-500 text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2"
                    onClick={() => handleSearchResultDownloadClick(video.id, 'mp3')}
                    disabled={loading}
                  >
                    <span className="text-lg">⬇️</span> Download MP3
                  </button>
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2"
                    onClick={() => handleSearchResultDownloadClick(video.id, 'mp4')}
                    disabled={loading}
                  >
                    <span className="text-lg">⬇️</span> Download MP4
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Optionally, show download iframes below results */}
        {(mp3IframeUrls.length > 0 || mp4IframeUrls.length > 0) && (
          <div className="w-full max-w-xl mx-auto mt-4 space-y-2">
            {(downloadType === 'mp3' ? mp3IframeUrls : mp4IframeUrls).map((url, idx) => (
              <iframe
                key={idx}
                src={url}
                className="w-full h-24 rounded border"
                allow="autoplay"
                title={`Download ${downloadType?.toUpperCase()} option ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </main>

      <main className="max-w-3xl mx-auto p-6 font-sans" style={{ fontFamily: "'Inter', 'Roboto', 'Poppins', Arial, sans-serif" }}>
  <h1 className="font-bold text-base leading-tight mb-2">
    FLVTO - YouTube to MP3 Converter
  </h1>
  <p className="text-sm leading-relaxed mb-6">
    <span className="font-semibold">Flvto</span> is a great online tool to
    convert YouTube videos to MP3 audio files, allowing you to download music
    from YouTube at no cost. With this converter, you can quickly convert
    YouTube videos to MP3 format in just a few seconds. We ensure that the audio
    quality of the MP3 downloads is high, providing you with an enjoyable
    listening experience. Flvto maintains the original quality of the audio
    files during conversion, so you can enjoy your favorite YouTube music
    offline whenever you want. Our converter is compatible with all devices,
    including PCs, Android phones, tablets, and iPhones, and there is no need to
    install any extra apps or software. What’s more, using our MP3 converter is
    fast, free, and safe. Enjoy unlimited access to your favorite YouTube music
    anytime, anywhere with Flvto.
  </p>
  <h2 className="font-bold text-base leading-tight mb-3">
    How can I convert YouTube videos to MP3 files using Flvto?
  </h2>
  <p className="text-sm leading-relaxed mb-6">
    FLVTO is a great tool to quickly download MP3 files from YouTube. Just
    follow the steps below:
  </p>
  <ol className="list-none space-y-6">
    <li className="flex items-start space-x-4">
      <div className="flex-shrink-0">
        <div className="bg-gray-300 text-gray-900 font-semibold rounded-full w-7 h-7 flex items-center justify-center text-sm select-none">
          1
        </div>
      </div>
      <div>
        <p className="font-semibold text-sm leading-snug mb-1">
          Copy YouTube Video URL
        </p>
        <p className="text-xs leading-relaxed max-w-prose">
          To download a YouTube video, start by opening the{" "}
          <span className="font-semibold">YouTube</span> website or app. Then,
          find the video you want to download and copy its URL.
        </p>
      </div>
    </li>
    <li className="flex items-start space-x-4">
      <div className="flex-shrink-0">
        <div className="bg-gray-300 text-gray-900 font-semibold rounded-full w-7 h-7 flex items-center justify-center text-sm select-none">
          2
        </div>
      </div>
      <div>
        <p className="font-semibold text-sm leading-snug mb-1">
          Enter URL on Flvto Site
        </p>
        <p className="text-xs leading-relaxed max-w-prose">
          Open the YouTube to MP3 converter website to convert YouTube videos to
          MP3. Then paste the YouTube video link into the search box.
        </p>
      </div>
    </li>
    <li className="flex items-start space-x-4">
      <div className="flex-shrink-0">
        <div className="bg-gray-300 text-gray-900 font-semibold rounded-full w-7 h-7 flex items-center justify-center text-sm select-none">
          3
        </div>
      </div>
      <div>
        <p className="font-semibold text-sm leading-snug mb-1">
          Select between MP3 or MP4 file format
        </p>
        <p className="text-xs leading-relaxed max-w-prose">
          Our <span className="font-semibold">YouTube to MP3</span> offers
          several format options, including MP3 and MP4. Choose MP3 if you want
          to convert audio and MP4 if you want to convert video.
        </p>
      </div>
    </li>
    <li className="flex items-start space-x-4">
      <div className="flex-shrink-0">
        <div className="bg-gray-300 text-gray-900 font-semibold rounded-full w-7 h-7 flex items-center justify-center text-sm select-none">
          4
        </div>
      </div>
      <div>
        <p className="font-semibold text-sm leading-snug mb-1">
          Click here to convert to MP3
        </p>
        <p className="text-xs leading-relaxed max-w-prose">
          Click the Convert button and wait a few minutes for the conversion to
          take place.
        </p>
      </div>
    </li>
  </ol>
</main>

<main className="max-w-3xl mx-auto p-6 font-sans" style={{ fontFamily: "'Inter', 'Roboto', 'Poppins', Arial, sans-serif" }}>
  <h2 className="font-extrabold text-gray-900 text-2xl md:text-3xl leading-tight mb-3 tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
    FLVTO is an important tool to download MP3 files from YouTube with various features.
  </h2>
  <p className="text-gray-800 mb-8 text-base md:text-lg">
    There are many reasons to use YouTube to MP3 to download YouTube videos as MP3 files. Below, we have listed the main benefits.
  </p>
  <section className="space-y-8">
    <article className="flex items-start space-x-4">
      <div className="flex-shrink-0 rounded-full bg-white shadow-md border border-gray-200 p-1">
        <img
          alt="Black square icon with white music note and MP3 text representing MP3 file"
          height={40}
          width={40}
          src="https://flvto.nu/_next/static/media/mp3-audio.b642e0a6.svg"
          className="rounded-full object-contain"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        />
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Listen without Online Access
        </h3>
        <p className="text-gray-800 text-base leading-relaxed">
          With our <strong>YouTube to MP3 converter</strong>, you can download and save your favorite songs from YouTube. This way, you can listen to your YouTube music anytime, even without an internet connection.
        </p>
      </div>
    </article>
    <article className="flex items-start space-x-4">
      <div className="flex-shrink-0 rounded-full bg-white shadow-md border border-gray-200 p-1">
        <img
          alt="Black circle icon with white clock face representing fast and free of charge"
          height={40}
          width={40}
          src="https://flvto.nu/_next/static/media/watch.c8bc5649.svg"
          className="rounded-full object-contain"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        />
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Fast and Free of Charge
        </h3>
        <p className="text-gray-800 text-base leading-relaxed">
          You can quickly download MP3 files using FLVTO with just a few clicks. Our tool efficiently meets your needs in moments and is free to use on any device.
        </p>
      </div>
    </article>
    <article className="flex items-start space-x-4">
      <div className="flex-shrink-0 rounded-full bg-white shadow-md border border-gray-200 p-1">
        <img
          alt="Black hand icon with sparkles representing easy to use"
          height={40}
          width={40}
          src="https://flvto.nu/_next/static/media/snap-fingers.0b68fe0c.svg"
          className="rounded-full object-contain"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        />
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
          100% Easy to Use
        </h3>
        <p className="text-gray-800 text-base leading-relaxed">
          Flvto is an easy way to download YouTube videos as MP3 files. Just paste the YouTube link into the search box and you can quickly download the MP3 file. It is a simple process that allows you to easily get MP3 from YouTube.
        </p>
      </div>
    </article>
    <article className="flex items-start space-x-4">
      <div className="flex-shrink-0 rounded-full bg-white shadow-md border border-gray-200 p-1">
        <img
          alt="Black square icon with white figure handing over a box representing no registration or software installation required"
          height={40}
          width={40}
          src="https://flvto.nu/_next/static/media/no-register.76d65916.svg"
          className="rounded-full object-contain"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        />
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
          No registration or software installation required
        </h3>
        <p className="text-gray-800 text-base leading-relaxed">
          Convert YouTube videos to MP3 and download them in seconds. No need to create an account and you can easily save MP3 files without installing any apps.
        </p>
      </div>
    </article>
    <article className="flex items-start space-x-4">
      <div className="flex-shrink-0 rounded-full bg-white shadow-md border border-gray-200 p-1">
        <img
          alt="Black icon with computer monitor and mobile device representing supports multiple platforms"
          height={40}
          width={40}
          src="https://flvto.nu/_next/static/media/multi-platform.b8b454f0.svg"
          className="rounded-full object-contain"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        />
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Supports multiple platforms
        </h3>
        <p className="text-gray-800 text-base leading-relaxed">
          Our YouTube Downloader works perfectly on all devices, including Android and iOS phones, computers, and tablets. It is also compatible with all web browsers, such as Chrome, Firefox, Safari, and Microsoft Edge.
        </p>
      </div>
    </article>
  </section>
</main>


<footer className="bg-[#2a2523] text-white">
  <div className="max-w-screen-xl mx-auto px-4 py-2 flex flex-wrap gap-x-4 gap-y-1 justify-between text-xs font-normal">
    <a href="#" className="hover:underline">
      Terms
    </a>
    <a href="#" className="hover:underline">
      Contact
    </a>
    <a href="#" className="hover:underline">
      Privacy
    </a>
    <a href="#" className="hover:underline">
      DMCA
    </a>
  </div>
  <div className="max-w-screen-xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between text-white text-sm font-semibold border-t border-[#3a3533]">
    <div className="font-extrabold text-lg">FLVTO</div>
    <div className="text-center md:text-right text-xs font-normal mt-1 md:mt-0">
      © Flvto, 2025
      <br />
      Developed by{" "}
      <a
        href="https://flvto.nu"
        target="_blank"
        className="font-bold hover:underline"
      >
        flvto.nu
      </a>
    </div>
    <div className="flex space-x-6 mt-2 md:mt-0 text-xl">
      <a href="#" aria-label="Twitter" className="hover:text-gray-300">
        <i className="fab fa-twitter" />
      </a>
      <a href="#" aria-label="Facebook" className="hover:text-gray-300">
        <i className="fab fa-facebook-f" />
      </a>
    </div>
  </div>
</footer>


      {/* Left vertical social share bar */}
   
      {/* Left vertical social share bar */}
 
      {/* Social share bar: full width on mobile, vertical on desktop */}
      {showShareBar && (
        <nav
          aria-label="Social share"
          className="
            fixed
            left-0
            bottom-0
            z-50
            flex
            w-full
            flex-row
            justify-center
            text-center
            select-none
            bg-white
            border-t
            border-gray-200
            md:top-[120px]
            md:left-0
            md:flex-col
            md:w-auto
            md:bottom-auto
            md:justify-start
            md:bg-transparent
            md:border-0
          "
        >
          <div className="bg-gray-300 text-gray-700 text-xs py-1 px-3 flex items-center md:rounded-none md:mb-0 mb-0 md:w-auto w-full md:justify-start justify-center">
            8 Shares
          </div>
          <a
            aria-label="Share on Facebook"
            className="bg-[#3b5998] text-white py-3 px-4 hover:bg-[#2d4373] transition md:w-auto w-full md:text-left text-center"
            href="#"
          >
            <i className="fab fa-facebook-f"></i>
          </a>
          <a
            aria-label="Share on Twitter"
            className="bg-black text-white py-3 px-4 hover:bg-gray-800 transition md:w-auto w-full md:text-left text-center"
            href="#"
          >
            <i className="fab fa-twitter"></i>
          </a>
          <a
            aria-label="Share on WhatsApp"
            className="bg-[#25d366] text-white py-3 px-4 hover:bg-[#1ebe57] transition md:w-auto w-full md:text-left text-center"
            href="#"
          >
            <i className="fab fa-whatsapp"></i>
          </a>
          <a
            aria-label="Share on Pinterest"
            className="bg-[#bd081c] text-white py-3 px-4 hover:bg-[#8c0613] transition md:w-auto w-full md:text-left text-center"
            href="#"
          >
            <i className="fab fa-pinterest-p"></i>
          </a>
          <a
            aria-label="Share on Telegram"
            className="bg-[#0088cc] text-white py-3 px-4 hover:bg-[#006699] transition md:w-auto w-full md:text-left text-center"
            href="#"
          >
            <i className="fab fa-telegram-plane"></i>
          </a>
        </nav>
      )}
    </div>
  );
};

export default App;
