export function formatDate(dateObj) {
    if (!dateObj) return "";
    const date = new Date(dateObj);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${year}`;
}

export function dateToRfc3339(dateObj) {
    if (!dateObj) return "";
    const date = new Date(dateObj);
    return date.toISOString();
}