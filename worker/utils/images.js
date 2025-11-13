import axios from 'axios';
import logger from '../../utils/logger.js';

const UNSPLASH_API_BASE = 'https://api.unsplash.com';

async function trackDownload(downloadUrl, accessKey) {
  if (!downloadUrl) return;

  try {
    await axios.get(downloadUrl, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });
  } catch (error) {
    logger.warn('Unsplash download tracking failed:', error.message);
  }
}

export async function fetchScenarioImageUrls({ keywords, personaName }) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    logger.warn('Unsplash access key not set; skipping image lookup');
    return [];
  }

  const query = keywords && keywords.length
    ? keywords.slice(0, 3).join(' ')
    : personaName || 'business professional';

  try {
    const response = await axios.get(`${UNSPLASH_API_BASE}/search/photos`, {
      params: {
        query,
        per_page: 2,
        orientation: 'landscape',
        client_id: accessKey,
      },
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    const results = response.data?.results || [];

    const images = results.map((photo) => ({
      url: photo.urls?.regular,
      alt: photo.alt_description || photo.description || query,
      photographer: photo.user?.name,
      photographerUrl: photo.user?.links?.html,
      downloadLocation: photo.links?.download_location,
    })).filter((photo) => photo.url);

    await Promise.all(
      images.map((image) => trackDownload(image.downloadLocation, accessKey))
    );

    return images.map(({ downloadLocation, ...rest }) => rest);
  } catch (error) {
    logger.error('Failed to fetch images from Unsplash:', error.response?.data || error.message);
    return [];
  }
}
