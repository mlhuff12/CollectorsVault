export function getApiErrorMessage(err: unknown, fallback: string): string {
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const { response } = err;
        if (typeof response === 'object' && response !== null && 'data' in response) {
            const { data } = response;
            if (typeof data === 'string' && data.length > 0) {
                return data;
            }
        }
    }
    return fallback;
}
