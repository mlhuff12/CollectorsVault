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

        scanner
            .start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
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
            })
            .catch((err) => {
                console.error('BarcodeScanner: failed to start camera', err);
                const msg =
                    'Camera could not be opened. Make sure the camera permission is granted, or manually enter UPC.';
                onError?.(msg);
                // do not call onClose; let parent decide how to hide scanner
                setStatus('error');
            });
    }, [onScan, onClose, stopScanner]);


    // no local UI for error any more; parent handles messages via onError callback

    if (status === 'error') {
        // parent has been notified and possibly closed us; render nothing
        return null;
    }

    return (
        <Box mt={3} border={1} borderRadius={1} p={2}>
            <Box display="flex" justifyContent="flex-end" mb={1}>
                <Button size="small" variant="outlined" onClick={handleClose}>
                    Cancel
                </Button>
            </Box>

            <Typography variant="body2" color="textSecondary" mb={1}>
                Point the camera at a barcode
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
                sx={{ width: '100%', maxWidth: '400px', borderRadius: '8px', overflow: 'hidden' }}
            />
        </Box>
    );
};

export default BarcodeScanner;
