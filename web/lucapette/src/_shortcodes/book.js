export function bookShortcode(bookId, title, name) {
    if (!bookId) {
        throw new Error('[book] the bookId must be specified');
    }
    
    const bookTitle = title || 'Book';
    const imageName = name || '';
    
    let imageHtml = '';
    if (imageName) {
        imageHtml = `
        <a
            class="book-cover"
            href="https://www.goodreads.com/book/show/${bookId}"
        >
            <img
                src="/assets/img/${imageName}"
                alt="${bookTitle}"
            />
        </a>`;
    }
    
    return `<div class="book">
        ${imageHtml}
    </div>`;
}

export default function(eleventyConfig) {
    eleventyConfig.addShortcode("book", bookShortcode);
}
