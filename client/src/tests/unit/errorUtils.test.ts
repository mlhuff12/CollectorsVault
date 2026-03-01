import { getApiErrorMessage } from '../../utils/errorUtils';

describe('getApiErrorMessage', () => {
    it('returns response data when error has string message in response.data', () => {
        const error = {
            response: {
                data: 'Invalid username or authenticator code.'
            }
        };

        const result = getApiErrorMessage(error, 'Fallback message');

        expect(result).toBe('Invalid username or authenticator code.');
    });

    it('returns fallback when response exists but data is not a string', () => {
        const error = {
            response: {
                data: { message: 'Nope' }
            }
        };

        const result = getApiErrorMessage(error, 'Fallback message');

        expect(result).toBe('Fallback message');
    });

    it('returns fallback when error does not have response', () => {
        const error = new Error('Network error');

        const result = getApiErrorMessage(error, 'Fallback message');

        expect(result).toBe('Fallback message');
    });

    it('returns fallback for null/primitive values', () => {
        expect(getApiErrorMessage(null, 'Fallback message')).toBe('Fallback message');
        expect(getApiErrorMessage('oops', 'Fallback message')).toBe('Fallback message');
        expect(getApiErrorMessage(42, 'Fallback message')).toBe('Fallback message');
    });
});
