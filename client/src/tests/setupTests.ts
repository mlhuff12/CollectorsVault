import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

declare global {
	var jest: typeof vi;
}

globalThis.jest = vi;
