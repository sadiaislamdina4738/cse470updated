import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import './EventQRCode.css';

const EventQRCode = ({ event }) => {
  const [showQR, setShowQR] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('png');

  if (!event) return null;

  // Generate event URL for QR code
  const eventUrl = `${window.location.origin}/events/${event._id}`;
  
  // Generate event data for sharing
  const eventData = {
    title: event.title,
    description: event.description,
    location: event.location,
    schedule: event.schedule,
    url: eventUrl
  };

  const handleDownload = () => {
    const canvas = document.querySelector('#event-qr-canvas');
    if (!canvas) return;

    if (downloadFormat === 'png') {
      // Download as PNG
      const link = document.createElement('a');
      link.download = `event-${event.title.replace(/\s+/g, '-')}-qr.png`;
      link.href = canvas.toDataURL();
      link.click();
    } else if (downloadFormat === 'svg') {
      // Download as SVG
      const svg = document.querySelector('#event-qr-svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const link = document.createElement('a');
        link.download = `event-${event.title.replace(/\s+/g, '-')}-qr.svg`;
        link.href = svgUrl;
        link.click();
        URL.revokeObjectURL(svgUrl);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out this event: ${event.title} at ${event.location}`,
          url: eventUrl
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(eventUrl);
        alert('Event URL copied to clipboard!');
      } catch (error) {
        console.log('Error copying to clipboard:', error);
      }
    }
  };

  return (
    <div className="event-qr-container">
      <div className="qr-header">
        <h3>Share This Event</h3>
        <p>Scan the QR code or share the link with friends</p>
      </div>

      <div className="qr-content">
        <div className="qr-toggle">
          <button
            onClick={() => setShowQR(!showQR)}
            className="btn btn-primary"
          >
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>
        </div>

        {showQR && (
          <div className="qr-display">
            <div className="qr-code-wrapper">
              {/* PNG version for download */}
              <div style={{ display: 'none' }}>
                <QRCode
                  id="event-qr-canvas"
                  value={JSON.stringify(eventData)}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
              
              {/* SVG version for display and download */}
              <QRCode
                id="event-qr-svg"
                value={JSON.stringify(eventData)}
                size={200}
                level="M"
                includeMargin={true}
                renderAs="svg"
              />
            </div>

            <div className="qr-info">
              <h4>{event.title}</h4>
              <p>📍 {event.location}</p>
              <p>📅 {new Date(event.schedule).toLocaleDateString()}</p>
            </div>

            <div className="qr-actions">
              <div className="download-options">
                <select
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value)}
                  className="download-select"
                >
                  <option value="png">PNG</option>
                  <option value="svg">SVG</option>
                </select>
                <button
                  onClick={handleDownload}
                  className="btn btn-secondary"
                >
                  Download QR
                </button>
              </div>
              
              <button
                onClick={handleShare}
                className="btn btn-primary"
              >
                Share Event
              </button>
            </div>
          </div>
        )}

        <div className="share-link">
          <label htmlFor="event-url" className="share-label">Event URL:</label>
          <div className="url-container">
            <input
              id="event-url"
              type="text"
              value={eventUrl}
              readOnly
              className="url-input"
            />
            <button
              onClick={() => navigator.clipboard.writeText(eventUrl)}
              className="copy-btn"
              title="Copy URL"
            >
              📋
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventQRCode;
