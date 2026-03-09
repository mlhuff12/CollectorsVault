import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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
        <div className="mt-3 border rounded p-2">
            <div className="d-flex justify-content-end mb-2">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleClose}
                >
                    Cancel
                </button>
            </div>

            <div className="mb-2">
                <span className="small text-muted">Point the camera at a barcode</span>
            </div>
            {status === 'starting' && (
                <div className="text-center py-2 text-muted small">
                    <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-label="starting camera"
                    />
                    Starting camera…
                </div>
            )}
            {/* The camera view div must always be in the DOM so html5-qrcode can attach to it */}
            <div
                id={SCANNER_ELEMENT_ID}
                style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', overflow: 'hidden' }}
            />

        </div>
    );
};

export default BarcodeScanner;
