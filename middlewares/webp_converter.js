const fs = require('fs');
const path = require('path');
const webp = require('webp-converter');

// Function to convert images to WebP format and delete originals
async function convertAndDelete(directoryPath) {
  try {
    // Get a list of files and directories in the specified directory
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

    // Process each entry
    const promises = entries.map(async (entry) => {
      const fullPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        // If the entry is a directory, recurse into it
        await convertAndDelete(fullPath);
      } else if (entry.isFile()) {
        // If the entry is a file, check if it's an image
        const allowedFormats = ['.jpg', '.jpeg', '.png'];
        if (allowedFormats.includes(path.extname(entry.name).toLowerCase())) {
          // Convert the image to WebP format and delete the original
          const outputPath = path.join(directoryPath, `${path.parse(entry.name).name}.webp`);
          const options = "-q 90"; // Customize options as needed

          await webp.cwebp(fullPath, outputPath, options, logging = "-v");

          // Delete the original file after successful conversion
          fs.unlinkSync(fullPath);
        }
      }
    });

    // Wait for all promises to resolve
    await Promise.all(promises);

    // console.log('Conversion and deletion completed successfully.');
  } catch (error) {
    console.error('Error converting images:', error);
    throw new Error('Error converting images to WebP format and deleting originals.');
  }
}

module.exports = {
  convertAndDelete,
};