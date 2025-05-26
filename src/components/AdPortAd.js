import React, { useEffect, useRef } from 'react';

const AdPortAd = ({ adUnitId, adFormat = 'banner', className = '' }) => {
  const adRef = useRef(null);

  useEffect(() => {
    // Initialize AdPort
    if (window.AdPort) {
      window.AdPort.init({
        publisherId: 'YOUR_PUBLISHER_ID', // Replace this with your publisher ID from AdPort dashboard
        adUnits: [{
          id: adUnitId, // This will be passed as prop from parent component
          format: adFormat,
          container: adRef.current
        }]
      });
    }

    // Cleanup
    return () => {
      if (window.AdPort) {
        window.AdPort.destroy(adUnitId);
      }
    };
  }, [adUnitId, adFormat]);

  return (
    <div 
      ref={adRef} 
      className={`adport-ad ${className}`}
      style={{
        minHeight: adFormat === 'banner' ? '250px' : '600px',
        width: '100%',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <span>Loading ad...</span>
    </div>
  );
};

export default AdPortAd; 