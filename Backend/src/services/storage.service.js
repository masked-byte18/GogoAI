const ImageKit = require("@imagekit/nodejs");
const dotenv = require("dotenv");

dotenv.config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function uploadFile({ fileBuffer, fileName, folder = "chatgpt-docs" }) {
  if (!fileBuffer || !fileName) {
    throw new Error("fileBuffer and fileName are required for upload");
  }

  const resolvedFileName = String(fileName || "").trim();
  if (!resolvedFileName) {
    throw new Error("fileName is required for upload");
  }

  let normalizedFile = fileBuffer;

  if (Buffer.isBuffer(fileBuffer)) {
    if (fileBuffer.length === 0) {
      throw new Error("fileBuffer must not be empty");
    }

    const extension = resolvedFileName.split('.').pop()?.toLowerCase() || '';
    const mimeByExt = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      pdf: 'application/pdf',
      txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    const mimeType = mimeByExt[extension] || 'application/octet-stream';

    normalizedFile = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  }

  try {
    const response = await imagekit.files.upload({
      file: normalizedFile,
      fileName: resolvedFileName,
      folder,
    });

    return response;
  } catch (error) {
    console.error("ImageKit Upload Error:", error);
    throw error;
  }
}

module.exports = {
  uploadFile,
};