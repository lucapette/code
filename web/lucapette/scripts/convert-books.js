import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksDir = '/Users/lucapette/src/code/web/lucapette/src/writing';

const years = ['2022', '2023', '2024', '2025'];

years.forEach(year => {
  const filePath = path.join(booksDir, `the-books-i-read-in-${year}`, 'index.md');
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Convert opening shortcode to HTML
  content = content.replace(/{{< book id="(\d+)" title="([^"]+)" name="([^"]+)" width="(\d+)" *>}}/g, 
    '<div class="book"><a class="book-cover" href="https://www.goodreads.com/book/show/$1"><img src="/assets/img/$3" alt="$2" width="$4"/></a><div class="book-review">');
  
  // Convert closing shortcode - handle multiple patterns
  // {{< /book >}} or {{</book>}} etc
  content = content.replace(/{{< *\/book * *>}}/g, '</div></div>');
  content = content.replace(/{{< *\/book *>}}/g, '</div></div>');
  
  fs.writeFileSync(filePath, content);
  console.log(`Processed: ${filePath}`);
});

console.log('Done!');
