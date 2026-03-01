import React, { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/** Props accepted by {@link BarcodeScanner}. */
interface BarcodeScannerProps {
    /** Called with the decoded barcode string when a barcode is successfully scanned. */
    onScan: (barcode: string) => void;
    /** Called when the user closes the scanner. */
    onClose: () => void;
}

const SCANNER_ELEMENT_ID = 'cv-barcode-scanner';

/**
 * BarcodeScanner opens the device camera and continuously scans for UPC/EAN barcodes.
 * It uses the html5-qrcode library and is designed for mobile browsers.
 * Calls `onScan` with the decoded barcode value, then stops scanning.
 */
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const hasScannedRef = useRef(false);

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
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;

        scanner.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                ]
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
        ).catch((err) => {
            console.error('BarcodeScanner: failed to start camera', err);
        });

        return () => {
            stopScanner();
        };
    }, [onScan, onClose, stopScanner]);

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted">Point the camera at a barcode</span>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleClose}
                >
                    Cancel
                </button>
            </div>
            <div
                id={SCANNER_ELEMENT_ID}
                style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', overflow: 'hidden' }}
            />
        </div>
    );
};

export default BarcodeScanner;
