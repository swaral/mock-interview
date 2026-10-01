// Turns the uploaded CV into (a) a Gemini content part and (b) plain text for Offline mode.
// PDFs and images are sent to Gemini as-is (it reads them natively, including scanned CVs).

const MAX_BYTES = 15 * 1024 * 1024;

export const ACCEPTED_CV = '.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp';

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read the CV file.'));
    reader.readAsDataURL(file);
  });
}

async function extractPdfText(file) {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 10); p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let line = '';
    let lastY = null;
    let lastXEnd = null;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (line.trim()) lines.push(line.trim());
        line = '';
        lastXEnd = null;
      }
      if (line && lastXEnd !== null && x - lastXEnd > 1 && !line.endsWith(' ') && !item.str.startsWith(' ')) line += ' ';
      line += item.str;
      lastY = y;
      lastXEnd = x + (item.width || 0);
      if (item.hasEOL) {
        if (line.trim()) lines.push(line.trim());
        line = '';
        lastXEnd = null;
      }
    }
    if (line.trim()) lines.push(line.trim());
  }
  return lines.join('\n');
}

async function extractDocxText(file) {
  const mod = await import('mammoth/mammoth.browser.js');
  const mammoth = mod.default || mod;
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

/** Returns { fileName, part, text }. `text` may be '' for images. */
export async function prepareCV(file) {
  if (!file) throw new Error('Please upload your CV.');
  if (file.size > MAX_BYTES) throw new Error('CV file is too large (max 15 MB).');
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    let text = '';
    try {
      text = await extractPdfText(file);
    } catch (e) {
      console.warn('PDF text extraction failed', e);
    }
    return {
      fileName: file.name,
      text,
      part: { inline_data: { mime_type: 'application/pdf', data: await toBase64(file) } },
    };
  }

  if (/\.(png|jpe?g|webp)$/.test(name)) {
    const mime = file.type || (name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    return { fileName: file.name, text: '', part: { inline_data: { mime_type: mime, data: await toBase64(file) } } };
  }

  if (name.endsWith('.docx')) {
    const text = await extractDocxText(file);
    if (!text.trim()) throw new Error('The DOCX file appears to be empty.');
    return { fileName: file.name, text, part: { text: `CV (extracted from ${file.name}):\n\n${text}` } };
  }

  if (/\.(txt|md)$/.test(name)) {
    const text = await file.text();
    if (!text.trim()) throw new Error('The CV file is empty.');
    return { fileName: file.name, text, part: { text: `CV (${file.name}):\n\n${text}` } };
  }

  if (name.endsWith('.doc')) throw new Error('Old .doc files are not supported. Save your CV as PDF or DOCX.');
  throw new Error('Unsupported file type. Upload a PDF, DOCX, TXT or an image of your CV.');
}
