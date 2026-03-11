import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Box, Button, Typography, CircularProgress } from '@mui/material';

/** Props accepted by {@link BarcodeScanner}. */
interface BarcodeScannerProps {
    /** Called with the decoded barcode string when a barcode is successfully scanned. */
    onScan: (barcode: string) => void;
    /** Called when the user closes the scanner. */
    onClose: () => void;
    /** Optional callback invoked when the camera fails to start. */
    onError?: (message: string) => void;
}

const SCANNER_ELEMENT_ID = 'cv-barcode-scanner';

/**
 * BarcodeScanner opens the device camera and continuously scans for UPC/EAN barcodes.
 * It uses the html5-qrcode library and is designed for mobile browsers.
 * Calls `onScan` with the decoded barcode value, then stops scanning.
 *
 * If the camera cannot be started (e.g. the site is not served over HTTPS, or camera
 * permission was denied), the component shows a warning toast message explaining the
 * problem and the user may close the scanner and enter the barcode manually in the
 * parent form.
 */
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, onError }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const hasScannedRef = useRef(false);
    const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [zoomSupported, setZoomSupported] = useState(false);
    const [zoomVal, setZoomVal] = useState<number>(1);
    const trackRef = useRef<MediaStreamTrack | null>(null);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch {
                // ignore stop errors
            }
            scannerRef.current = null;
        }
    }, []);

    const handleClose = useCallback(async () => {
        await stopScanner();
        onClose();
    }, [stopScanner, onClose]);

    useEffect(() => {
        // disable page scroll while scanner overlay is open
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        // if a previous scanner instance survived somehow, stop it first
        let didCancel = false;
        const initScanner = async () => {
            await stopScanner();

            if (didCancel) return;

            const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                ],
                verbose: false,
            });
            scannerRef.current = scanner;

            // clear any previous content in case the element survived between mounts
            const container = document.getElementById(SCANNER_ELEMENT_ID);
            if (container) {
                container.innerHTML = '';
            }

            scanner
                .start(
                    // primary constraint object – keep for compatibility but we also
                    // repeat in videoConstraints below to be extra‑strict.
                    { facingMode },
                    {
                        fps: 10,
                        // remove qrbox so the entire video frame is scanned; avoids zooming
                        videoConstraints: {
                            facingMode: { exact: 'environment' },
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            aspectRatio: 16/9,
                        },
                    },
                    (decodedText) => {
                        if (hasScannedRef.current) return;
                        hasScannedRef.current = true;
                        stopScanner().then(() => {
                            onScan(decodedText);
                            onClose();
                        });
                    },
                    () => {
                        // scan failure is expected between frames — ignore
                    }
                )
                .then(() => {
                    setStatus('scanning');
                    // attach tap listener to attempt autofocus if supported
                    const container = document.getElementById(SCANNER_ELEMENT_ID);
                    const videoEl = container?.querySelector('video');
                    if (videoEl) {
                        const stream = (videoEl as HTMLVideoElement).srcObject as MediaStream | null;
                        if (stream) {
                            const [track] = stream.getVideoTracks();
                            if (track) {
                                trackRef.current = track;
                                const caps = track.getCapabilities ? track.getCapabilities() : {} as any;
                                if (caps.zoom) {
                                    setZoomSupported(true);
                                    const settings = track.getSettings ? track.getSettings() : {} as any;
                                    setZoomVal(settings.zoom ?? caps.zoom.min ?? 1);
                                }
                            }
                        }
                        videoEl.addEventListener('click', async () => {
                            const stream2 = (videoEl as HTMLVideoElement).srcObject as MediaStream | null;
                            if (stream2) {
                                const [track2] = stream2.getVideoTracks();
                                if (track2) {
                                    const caps2 = track2.getCapabilities ? track2.getCapabilities() : {} as any;
                                    if (caps2.focusMode) {
                                        try {
                                            await track2.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
                                        } catch {
                                            // ignore unsupported
                                        }
                                    }
                                }
                            }
                        });
                    }
                })
                .catch((err) => {
                    console.error('BarcodeScanner: failed to start camera', err);
                    const msg =
                        'Camera could not be opened. Make sure the camera permission is granted, or manually enter UPC.';
                    onError?.(msg);
                    // do not call onClose; let parent decide how to hide scanner
                    setStatus('error');
                });
        };

        initScanner();

        return () => {
            didCancel = true;
            stopScanner();
            const containerCleanup = document.getElementById(SCANNER_ELEMENT_ID);
            if (containerCleanup) {
                containerCleanup.innerHTML = '';
            }
            // restore original body overflow
            document.body.style.overflow = prevOverflow;
        };
    }, [onScan, onClose, stopScanner]);


    // no local UI for error any more; parent handles messages via onError callback

    if (status === 'error') {
        // parent has been notified and possibly closed us; render nothing
        return null;
    }

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1400,
                bgcolor: 'rgba(0,0,0,0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                p: 2,
            }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <Box display="flex" justifyContent="flex-end" mb={1}>
                <Button size="small" variant="outlined" onClick={handleClose}>
                    Cancel
                </Button>
            </Box>

            <Typography variant="body2" color="textSecondary" mb={1}>
                Point the camera at a barcode
            </Typography>
            <Typography variant="caption" color="textSecondary" mb={1}>
                If the image is blurry, try tapping the video or moving your phone slightly.
                You can also close and reopen the scanner to refocus.
            </Typography>
            {status === 'starting' && (
                <Box textAlign="center" py={2}>
                    <CircularProgress size={16} sx={{ mr: 1 }} aria-label="starting camera" />
                    <Typography variant="body2" color="textSecondary" component="span">
                        Starting camera…
                    </Typography>
                </Box>
            )}
            {/* The camera view div must always be in the DOM so html5-qrcode can attach to it */}
            <Box
                id={SCANNER_ELEMENT_ID}
                sx={{
                    width: '100%',
                    height: '100%',
                    flex: 1,
                    borderRadius: '8px',
                    overflow: 'hidden',
                }}
                style={{ width: '100%', height: '100%' }}
            />
            <Box mt={1} display="flex" alignItems="center" gap={1}>
                <Button size="small" onClick={async () => { await stopScanner(); setStatus('starting'); }}>
                    Restart Camera
                </Button>
                <Button size="small" onClick={async () => { await stopScanner(); setStatus('starting'); setFacingMode(prev => prev === 'environment' ? 'user' : 'environment'); }}>
                    Flip Camera
                </Button>
                {zoomSupported && (
                    <Box sx={{ width: 150, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption">Zoom:</Typography>
                        <input
                            type="range"
                            min={trackRef.current?.getCapabilities().zoom?.min ?? 1}
                            max={trackRef.current?.getCapabilities().zoom?.max ?? 1}
                            step={trackRef.current?.getCapabilities().zoom?.step ?? 0.1}
                            value={zoomVal}
                            onChange={async (e) => {
                                const val = Number(e.target.value);
                                setZoomVal(val);
                                if (trackRef.current && trackRef.current.applyConstraints) {
                                    try {
                                        await trackRef.current.applyConstraints({ advanced: [{ zoom: val }] });
                                    } catch {
                                        // ignore
                                    }
                                }
                            }}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default BarcodeScanner;
