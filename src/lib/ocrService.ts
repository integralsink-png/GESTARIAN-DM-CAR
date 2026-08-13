import Tesseract from 'tesseract.js';

export async function extractTextFromImage(imageUrl: string): Promise<string> {
  try {
    const result = await Tesseract.recognize(imageUrl, 'spa', {
      logger: m => console.log(m)
    });
    return result.data.text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('No se pudo extraer el texto de la imagen.');
  }
}
