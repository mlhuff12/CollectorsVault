import React, { useState, useEffect, useCallback, useId } from 'react';
import BarcodeScanner from './BarcodeScanner';
import Toast from './Toast';

/** Props accepted by {@link BarcodeScanLookup}. */
interface BarcodeScanLookupProps {
    /** Optional label shown above the input. */
    label?: string;
    /** Placeholder text for the input. */
    placeholder: string;
    /** Maximum length for the text field; passed directly to <input>. */
    maxLength?: number;
    /** Current value of the input if the caller wants to control it. */
    value?: string;
    /** Called when the input text changes (including when a barcode is scanned). */
    onChange?: (value: string) => void;
    /** Invoked when the user requests a lookup, either by pressing the button or
     * after a successful scan. The component will await the returned promise so it
     * can display a loading indicator.
     */
    onLookup: (barcode: string) => Promise<void> | void;
    /** Optional error message to display underneath the control. The caller can use
     * this to show lookup failures or validation messages. */
    error?: string;
}

/**
 * BarcodeScanLookup renders a single-line text input paired with a "Lookup"
 * button, an optional "OR"/"Scan Barcode" control, and built‑in camera
 * handling.  The component is largely self-contained: it detects whether the
 * browser supports a camera, shows a scanner UI when requested, and exposes
 * hooks that allow a parent to perform the actual lookup and keep track of the
 * current barcode value.
 */
// module-level flag tracks whether we've already determined scanning doesn't work
let scanUnsupportedPermanently = false;

const BarcodeScanLookup: React.FC<BarcodeScanLookupProps> = ({
    label,
    placeholder,
    maxLength,
    value,
    onChange,
    onLookup,
    error,
}) => {
    const reactId = useId();
    const inputId = `barcode-lookup-${reactId}`;

    const [input, setInput] = useState(value ?? '');
    const [canScan, setCanScan] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanError, setScanError] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    // keep local state in sync with controlled value prop
    useEffect(() => {
        if (value !== undefined && value !== input) {
            setInput(value);
        }
    }, [value, input]);

    useEffect(() => {
        if (scanUnsupportedPermanently) {
            setCanScan(false);
        } else if (
            navigator.mediaDevices &&
            typeof navigator.mediaDevices.getUserMedia === 'function'
        ) {
            setCanScan(true);
        } else {
            setCanScan(false);
        }
    }, []);

    const notifyChange = (newVal: string) => {
        setInput(newVal);
        onChange?.(newVal);
    };

    const performLookup = useCallback(
        async (barcode: string) => {
            setScanLoading(true);
            try {
                await onLookup(barcode);
            } catch {
                // swallow; parent may handle its own errors
            } finally {
                setScanLoading(false);
            }
        },
        [onLookup]
    );

    const handleManualLookup = () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        setScanError('');
        performLookup(trimmed);
    };

    const handleBarcodeScan = useCallback(
        async (barcode: string) => {
            setShowScanner(false);
            setScanError('');
            notifyChange(barcode);
            await performLookup(barcode);
        },
        [performLookup]
    );

    const attemptScan = () => {
        if (!canScan) {
            // if we've already decided scanning is permanently unsupported, skip toast
            if (!scanUnsupportedPermanently) {
                setToastMessage(
                    'Camera could not be opened, make sure camera permission is granted, or enter the barcode manually.'
                );
                setToastType('error');
            }
            return;
        }
        if (navigator.permissions) {
            navigator.permissions
                .query({ name: 'camera' as PermissionName })
                .then((p) => {
                    if (p.state === 'denied') {
                        // no point in offering the scan UI any more
                        scanUnsupportedPermanently = true;
                        setCanScan(false);
                        // warning text below input is sufficient; no toast
                    } else {
                        setShowScanner((prev) => !prev);
                    }
                })
                .catch(() => {
                    setShowScanner((prev) => !prev);
                });
        } else {
            setShowScanner((prev) => !prev);
        }
    };

    return (
        <div className="mb-3">
            {label && (
                <label htmlFor={inputId} className="form-label">
                    {label}
                </label>
            )}
            <div className="input-group">
                <input
                    id={inputId}
                    type="text"
                    className="form-control"
                    placeholder={placeholder}
                    value={input}
                    maxLength={maxLength}
                    onChange={(e) => {
                        notifyChange(e.target.value);
                        setScanError('');
                    }}
                />
                <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!input.trim() || scanLoading}
                    onClick={handleManualLookup}
                >
                    {scanLoading ? 'Looking up…' : 'Lookup'}
                </button>
                {canScan ? (
                    <>
                        <div className="input-group-text">OR</div>
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                                setScanError('');
                                attemptScan();
                            }}
                            disabled={scanLoading}
                        >
                            {scanLoading ? 'Looking up…' : '📷 Scan Barcode'}
                        </button>
                    </>
                ) : (
                    // scanning is not available; hide the OR/button and show a warning below
                    <></>
                )}
            </div>
            {/* if camera support isn't detected, always inform the user */}
            {!canScan && (
                <div className="form-text text-warning mb-2">
                    Barcode scanning is not supported on this device; please enter the
                    barcode manually.
                </div>
            )}
            {/* scanError from a failed camera start is useful only until
                we mark scanning as permanently unsupported; afterwards the
                generic warning text covers the situation. */}
            {scanError && !scanUnsupportedPermanently && (
                <div className="form-text text-warning mb-2">{scanError}</div>
            )}
            {error && <div className="form-text text-warning mb-2">{error}</div>}
            {showScanner && (
                <BarcodeScanner
                    onScan={handleBarcodeScan}
                    onError={(msg) => {
                        // if the scanner component reports a failure (no camera, etc.)
                        // treat scanning as unavailable going forward so the UI hides
                        // the OR/button and the user sees the warning text.
                        scanUnsupportedPermanently = true;
                        setScanError(msg);
                        setCanScan(false);
                        setShowScanner(false);
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}
            <Toast
                message={toastMessage}
                type={toastType}
                onDismiss={() => setToastMessage('')}
            />
        </div>
    );
};

export default BarcodeScanLookup;
