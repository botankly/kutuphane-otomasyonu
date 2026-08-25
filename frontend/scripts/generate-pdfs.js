const fs = require('fs');
const path = require('path');

const outputDirs = [
  path.join(__dirname, '../public/pdfs'),
  path.join(__dirname, '../public/pdf')
];

outputDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Function to generate a valid multi-page PDF file buffer
function generateMultiPagePdf(title, author, totalPages) {
  let pdfString = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  
  let kids = [];
  for (let i = 0; i < totalPages; i++) {
    kids.push(`${3 + i * 2} 0 R`);
  }
  
  let pagesObj = `2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>\nendobj\n`;
  pdfString += pagesObj;
  
  let nextObjId = 3;
  for (let i = 1; i <= totalPages; i++) {
    let pageObjId = nextObjId++;
    let contentObjId = nextObjId++;
    
    let contentText = `BT /F1 20 Tf 50 720 Td (${title.replace(/[()]/g, '')}) Tj 0 -35 Td /F1 14 Tf (Yazar: ${author.replace(/[()]/g, '')}) Tj 0 -30 Td /F1 12 Tf (Universite Kutup-hane Bilgi Sistemi - Dijital E-Kitap Deposu) Tj 0 -25 Td (Sayfa ${i} / ${totalPages}) Tj ET`;
    let contentObj = `${contentObjId} 0 obj\n<< /Length ${contentText.length} >>\nstream\n${contentText}\nendstream\nendobj\n`;
    let pageObj = `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`;
    
    pdfString += pageObj + contentObj;
  }
  
  return pdfString;
}

const books = [
  { slug: 'clean-code.pdf', title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin', pages: 12 },
  { slug: 'design-patterns.pdf', title: 'Design Patterns: Elements of Reusable Software', author: 'Erich Gamma', pages: 10 },
  { slug: 'pragmatic-programmer.pdf', title: 'The Pragmatic Programmer', author: 'Andrew Hunt', pages: 14 },
  { slug: 'refactoring.pdf', title: 'Refactoring: Improving Existing Code', author: 'Martin Fowler', pages: 15 },
  { slug: 'nutuk.pdf', title: 'Nutuk', author: 'Mustafa Kemal Ataturk', pages: 543 },
  { slug: 'devlet.pdf', title: 'Devlet (Politeia)', author: 'Platon', pages: 280 },
  { slug: 'dune.pdf', title: 'Dune', author: 'Frank Herbert', pages: 412 },
  { slug: '1984.pdf', title: '1984', author: 'George Orwell', pages: 328 },
  { slug: 'suc-ve-ceza.pdf', title: 'Suc ve Ceza', author: 'Fyodor Dostoyevski', pages: 580 },
  { slug: 'kucuk-prens.pdf', title: 'Kucuk Prens', author: 'Antoine de Saint-Exupery', pages: 96 },
  { slug: 'sefiller.pdf', title: 'Sefiller', author: 'Victor Hugo', pages: 820 },
  { slug: 'simyaci.pdf', title: 'Simyaci', author: 'Paulo Coelho', pages: 184 },
  { slug: 'uluslarin-zenginligi.pdf', title: 'Uluslarin Zenginligi', author: 'Adam Smith', pages: 640 },
  { slug: 'fahrenheit-451.pdf', title: 'Fahrenheit 451', author: 'Ray Bradbury', pages: 240 },
  { slug: 'insanligin-hafizasi.pdf', title: 'Insanligin Hafizasi Kutup-hane', author: 'Alberto Manguel', pages: 310 }
];

console.log('📚 Multi-page PDF dosyaları /pdfs ve /pdf klasörlerine üretiliyor...');
books.forEach(b => {
  const content = generateMultiPagePdf(b.title, b.author, b.pages);
  outputDirs.forEach(dir => {
    const filePath = path.join(dir, b.slug);
    fs.writeFileSync(filePath, content, 'utf-8');
  });
  console.log(`✅ ${b.slug} (${b.pages} Sayfa) olusturuldu.`);
});
console.log('🎉 Tüm e-kitap PDF dosyaları hazır!');
