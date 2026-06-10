/**
 * Perceptual Image Hashing & Matching Utility (dHash)
 * Runs client-side in the browser using HTML5 Canvas.
 */

/**
 * Computes the 64-bit difference hash (dHash) of an Image element.
 * 1. Resizes image to 9x8 pixels.
 * 2. Converts to grayscale.
 * 3. Compares adjacent pixels row-by-row to generate 64 bits.
 * 4. Encodes bits into a 16-character hexadecimal string.
 */
const isImageBlank = (gray) => {
  let sum = 0;
  for (let i = 0; i < gray.length; i++) {
    sum += gray[i];
  }
  const mean = sum / gray.length;

  let varianceSum = 0;
  for (let i = 0; i < gray.length; i++) {
    varianceSum += Math.pow(gray[i] - mean, 2);
  }
  const stdDev = Math.sqrt(varianceSum / gray.length);
  return stdDev < 10;
};

export const computeImageDHash = (imgElement) => {
  const width = 9;
  const height = 8;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get 2D canvas context');
  }

  // Draw and resize image
  ctx.drawImage(imgElement, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert to grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Standard luminosity coefficients
    gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Check if blank/solid
  if (isImageBlank(gray)) {
    throw new Error('BLANK_IMAGE');
  }

  // Compute horizontal differences (row by row)
  const difference = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width - 1; col++) {
      const leftIdx = row * width + col;
      const rightIdx = leftIdx + 1;
      difference.push(gray[leftIdx] > gray[rightIdx]);
    }
  }

  // Convert binary array to hex string
  let hexString = '';
  for (let i = 0; i < difference.length; i += 8) {
    let byteVal = 0;
    for (let bit = 0; bit < 8; bit++) {
      if (difference[i + bit]) {
        byteVal += (1 << bit);
      }
    }
    hexString += byteVal.toString(16).padStart(2, '0');
  }

  return hexString;
};

/**
 * Reads a File object, loads it as an image, and computes its dHash.
 */
export const getFileDHash = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const hash = computeImageDHash(img);
          resolve(hash);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image file into browser element'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Calculates the Hamming distance between two 16-char hex hashes.
 * Max distance is 64 (representing complete difference).
 */
export const calculateHammingDistance = (hash1, hash2) => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;

  let distance = 0;
  for (let i = 0; i < hash1.length; i += 2) {
    const byte1 = parseInt(hash1.substring(i, i + 2), 16);
    const byte2 = parseInt(hash2.substring(i, i + 2), 16);

    // XOR the two bytes and count set bits (Hamming weight)
    let xor = byte1 ^ byte2;
    while (xor > 0) {
      if (xor & 1) distance++;
      xor >>= 1;
    }
  }
  return distance;
};

/**
 * Compares an uploaded image file against the pre-loaded metadata list of images.
 * Returns the closest match if it meets the similarity threshold.
 */
export const findClosestMatch = async (file, threshold = 0.70) => {
  try {
    // 1. Fetch metadata list
    const response = await fetch('/dataset/metadata.json');
    if (!response.ok) {
      console.warn('Dataset metadata.json could not be loaded.');
      return { status: 'NO_MATCH' };
    }
    const dataset = await response.json();
    if (!dataset || dataset.length === 0 || (dataset.length === 1 && dataset[0].filename === 'sample_case.jpg')) {
      console.log('Dataset is empty or only contains default placeholder.');
      return { status: 'NO_MATCH' };
    }

    // 2. Compute hash of uploaded file
    const uploadHash = await getFileDHash(file);
    if (!uploadHash) return { status: 'NO_MATCH' };

    let bestMatch = null;
    let highestSimilarity = 0;

    // 3. Compare with all items in metadata
    for (const item of dataset) {
      if (!item.hash) continue;
      
      const distance = calculateHammingDistance(uploadHash, item.hash);
      const similarity = 1 - (distance / 64); // 64 bits total

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = item;
      }
    }

    console.log(`Best match found: ${bestMatch?.filename} with similarity: ${(highestSimilarity * 100).toFixed(1)}%`);

    // 4. Return result if it meets threshold (70% similarity)
    if (highestSimilarity >= threshold) {
      return {
        status: 'MATCH',
        match: {
          ...bestMatch,
          similarity: highestSimilarity
        }
      };
    }
    
    // If it doesn't match any clinical image with >= 70% similarity, it's not a valid orthodontic scan
    return { status: 'INVALID_TEETH' };
  } catch (error) {
    console.error('Error finding closest match:', error);
    if (error.message === 'BLANK_IMAGE') {
      return { status: 'BLANK' };
    }
    return { status: 'INVALID_TEETH' };
  }
};
