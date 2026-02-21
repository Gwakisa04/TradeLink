import { useEffect, useRef, useState } from 'react';

const JSQR_SCRIPT = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';

function useBarcodeDetector() {
  const [supported, setSupported] = useState(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupported('BarcodeDetector' in window);
  }, []);
  return supported;
}

function loadJsQR() {
  if (window.jsQR) return Promise.resolve();
  if (window.__jsQRLoading) return window.__jsQRLoading;
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = JSQR_SCRIPT;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load QR decoder.'));
    document.head.appendChild(s);
  });
  window.__jsQRLoading = p;
  return p;
}

function decodeWithBarcodeDetector(file) {
  const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      detector.detect(img)
        .then((results) => {
          URL.revokeObjectURL(url);
          if (results.length > 0 && results[0].rawValue) resolve(results[0].rawValue);
          else reject(new Error('No QR code found in this image.'));
        })
        .catch((e) => {
          URL.revokeObjectURL(url);
          reject(e);
        });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image.'));
    };
    img.src = url;
  });
}

function decodeWithJsQR(file) {
  return loadJsQR().then(() => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error('Canvas not supported.'));
        }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (result && result.data) resolve(result.data);
        else reject(new Error('No QR code found in this image.'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not load image.'));
      };
      img.src = url;
    });
  });
}

function decodeImageFile(file, barcodeSupported) {
  if (barcodeSupported) return decodeWithBarcodeDetector(file);
  return decodeWithJsQR(file);
}

function useCameraScan(videoRef, onScan, active) {
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active || !videoRef.current || !('BarcodeDetector' in window)) return;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    detectorRef.current = detector;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(() => {});

    function tick() {
      if (!videoRef.current || !detectorRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      detector.detect(videoRef.current)
        .then((results) => {
          if (results.length > 0 && results[0].rawValue) {
            onScan(results[0].rawValue);
            return;
          }
          rafRef.current = requestAnimationFrame(tick);
        })
        .catch(() => { rafRef.current = requestAnimationFrame(tick); });
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active, onScan]);
}

export default function ScanQRModal({ onScan, onClose }) {
  const [error, setError] = useState('');
  const [mode, setMode] = useState('file');
  const [jsQRReady, setJsQRReady] = useState(false);
  const videoRef = useRef(null);
  const barcodeSupported = useBarcodeDetector();

  useEffect(() => {
    if (barcodeSupported === false) loadJsQR().then(() => setJsQRReady(true)).catch(() => {});
  }, [barcodeSupported]);

  const handleScanResult = (decodedText) => {
    onScan(decodedText);
    onClose();
  };

  useCameraScan(videoRef, handleScanResult, mode === 'camera' && barcodeSupported === true);

  function handleFile(e) {
    const file = e.target?.files?.[0];
    if (!file) return;
    setError('');
    if (barcodeSupported === false && !jsQRReady) {
      setError('QR decoder is loading. Please try again in a moment.');
      e.target.value = '';
      return;
    }
    decodeImageFile(file, barcodeSupported === true)
      .then((decodedText) => handleScanResult(decodedText))
      .catch((e) => setError(e.message || 'No QR code found in this image.'));
    e.target.value = '';
  }

  const canUseCamera = barcodeSupported === true;
  const canUpload = barcodeSupported === true || jsQRReady;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Scan QR code">
      <div className="modal-content scan-qr-modal">
        <div className="modal-header">
          <h3>Scan payment request QR</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        {error && <div className="result-box error" style={{ marginBottom: '0.75rem' }}>{error}</div>}
        {barcodeSupported === false && !jsQRReady && (
          <div className="result-box info" style={{ marginBottom: '0.75rem' }}>
            Loading QR decoder… Upload an image in a moment.
          </div>
        )}
        {barcodeSupported === false && jsQRReady && (
          <div className="result-box info" style={{ marginBottom: '0.75rem' }}>
            Upload an image of the QR code below. Camera is available in Chrome or Edge.
          </div>
        )}
        <div className="scan-qr-tabs">
          <button
            type="button"
            className={mode === 'camera' ? 'active' : ''}
            onClick={() => { setMode('camera'); setError(''); }}
            disabled={!canUseCamera}
          >
            Camera
          </button>
          <button
            type="button"
            className={mode === 'file' ? 'active' : ''}
            onClick={() => { setMode('file'); setError(''); }}
          >
            Upload image
          </button>
        </div>
        {mode === 'camera' && canUseCamera && (
          <div className="qr-reader">
            <video ref={videoRef} muted playsInline style={{ width: '100%', maxHeight: '260px', borderRadius: '8px' }} />
          </div>
        )}
        {mode === 'file' && (
          <div className="scan-qr-file">
            <label className="btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
              Choose image
              <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} disabled={!canUpload} />
            </label>
            {!canUpload && <p className="panel-hint" style={{ marginTop: '0.5rem' }}>Loading…</p>}
          </div>
        )}
      </div>
    </div>
  );
}
