import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './EventQRCode.css';

const EventQRCode = ({ event }) => {
  const [showQR, setShowQR] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('png');
  const [shareUrl, setShareUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(true);

  useEffect(() => {
    if (!event?._id) return undefined;
    let cancelled = false;
    (async () => {
      setLinkLoading(true);
      try {
        const res = await api.get(`/events/${event._id}/share-link`);
        const url = res.data?.shareUrl;
        if (!cancelled && url) setShareUrl(url);
      } catch {
        if (!cancelled) {
          const fallback = `${window.location.origin}/events/${event._id}`;
          setShareUrl(fallback);
          toast.error('Could not load canonical link; using current origin.');
        }
      } finally {
        if (!cancelled) setLinkLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event?._id]);

  if (!event) return null;

  const displayUrl = shareUrl || `${window.location.origin}/events/${event._id}`;

  const handleDownload = () => {
    const canvas = document.querySelector('#event-qr-canvas');
    if (!canvas) return;

    if (downloadFormat === 'png') {
      const link = document.createElement('a');
      link.download = `event-${event.title.replace(/\s+/g, '-')}-qr.png`;
      link.href = canvas.toDataURL();
      link.click();
    } else if (downloadFormat === 'svg') {
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
          url: displayUrl
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(displayUrl);
        toast.success('Event URL copied to clipboard');
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
            type="button"
            onClick={() => setShowQR(!showQR)}
            className="btn btn-primary"
          >
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>
        </div>

        {linkLoading && <p className="qr-loading">Resolving share link…</p>}

        {showQR && !linkLoading && (
          <div className="qr-display">
            <div className="qr-code-wrapper">
              <div style={{ display: 'none' }}>
                <QRCode
                  id="event-qr-canvas"
                  value={displayUrl}
                  size={200}
                  level="M"
                  includeMargin
                />
              </div>

              <QRCode
                id="event-qr-svg"
                value={displayUrl}
                size={200}
                level="M"
                includeMargin
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
                <button type="button" onClick={handleDownload} className="btn btn-secondary">
                  Download QR
                </button>
              </div>

              <button type="button" onClick={handleShare} className="btn btn-primary">
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
              value={displayUrl}
              readOnly
              className="url-input"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(displayUrl).then(() => toast.success('Copied')).catch(() => {});
              }}
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
