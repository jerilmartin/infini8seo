import logger from '../../utils/logger.js';
import puppeteer from 'puppeteer';

/**
 * HTML Fetcher with Puppeteer support for JS-rendered sites
 * Falls back to simple fetch for static sites
 */

let browser = null;

async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-extensions'
            ]
        });
    }
    return browser;
}

export async function fetchPageContent(url) {
    logger.info(`Fetching page content for analysis: ${url}`);

    // Try simple fetch first (faster for static sites)
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();

        // Check if page has meaningful content (not just JS loading screen)
        const cleanText = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '')
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // If content is too short, it's likely a JS-rendered site
        if (cleanText.length < 500) {
            logger.info('Content too short, using Puppeteer to render JavaScript...');
            return await fetchWithPuppeteer(url);
        }

        return {
            html,
            text: cleanText.substring(0, 50000) // Limit text for processing
        };
    } catch (error) {
        logger.warn(`Simple fetch failed: ${error.message}. Trying Puppeteer...`);
        return await fetchWithPuppeteer(url);
    }
}

async function fetchWithPuppeteer(url) {
    let page = null;
    try {
        const browserInstance = await getBrowser();
        page = await browserInstance.newPage();
        
        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Navigate and wait for content
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait a bit more for any lazy-loaded content
        await page.waitForTimeout(2000);
        
        // Get the rendered HTML
        const html = await page.content();
        
        // Extract text content
        const text = await page.evaluate(() => {
            // Remove script and style tags
            const scripts = document.querySelectorAll('script, style, noscript');
            scripts.forEach(el => el.remove());
            
            // Get body text
            return document.body.innerText || document.body.textContent || '';
        });
        
        logger.info(`✓ Puppeteer successfully rendered page (${text.length} chars)`);
        
        return {
            html,
            text: text.substring(0, 50000)
        };
        
    } catch (error) {
        logger.error(`Puppeteer fetch failed for ${url}:`, error.message);
        return null;
    } finally {
        if (page) {
            await page.close();
        }
    }
}

// Cleanup function to close browser on shutdown
export async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
        logger.info('Puppeteer browser closed');
    }
}

export default { fetchPageContent, closeBrowser };
