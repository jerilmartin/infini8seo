import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

/**
 * WHOIS Fetcher
 * Runs OS-level whois command to get domain registration data.
 * Falls back to HTTP API if whois command is unavailable (e.g., on Windows).
 */

/**
 * Fetch WHOIS data via HTTP API (fallback for Windows)
 */
async function fetchWhoisViaApi(domain) {
    return new Promise((resolve, reject) => {
        // Use a free WHOIS lookup service
        const options = {
            hostname: 'www.whoisxmlapi.com',
            path: `/whoisserver/WhoisService?apiKey=at_free&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`,
            method: 'GET',
            timeout: 15000
        };

        logger.info(`Attempting WHOIS API lookup for ${domain}...`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.WhoisRecord) {
                        const record = json.WhoisRecord;
                        logger.info(`WHOIS API returned data for ${domain}`);
                        resolve({
                            creationDate: record.createdDate || record.registryData?.createdDate || null,
                            expiryDate: record.expiresDate || record.registryData?.expiresDate || null,
                            registrar: record.registrarName || record.registrarIANAID || null,
                            ageYears: null // Will be calculated
                        });
                    } else {
                        logger.warn(`WHOIS API returned no record for ${domain}`);
                        resolve(null);
                    }
                } catch (e) {
                    logger.error(`WHOIS API parse error: ${e.message}`);
                    resolve(null);
                }
            });
        });

        req.on('error', (err) => {
            logger.error(`WHOIS API request error: ${err.message}`);
            resolve(null);
        });
        req.on('timeout', () => {
            logger.warn('WHOIS API request timeout');
            req.destroy();
            resolve(null);
        });
        req.end();
    });
}

/**
 * Fetch WHOIS data for a domain
 * @param {string} domain - The domain to lookup (e.g., example.com)
 * @returns {Promise<{creationDate: string|null, expiryDate: string|null, registrar: string|null, ageYears: number|null}>}
 */
export async function fetchWhoisData(domain) {
    try {
        // Clean domain - remove protocol and www
        const cleanDomain = domain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/')[0];

        logger.info(`Fetching WHOIS for domain: ${cleanDomain}`);

        let whoisData = null;

        // Try OS-level whois command first
        try {
            const { stdout, stderr } = await execAsync(`whois ${cleanDomain}`, {
                timeout: 30000,
                maxBuffer: 1024 * 1024,
            });

            if (stderr && !stdout) {
                logger.warn(`WHOIS stderr: ${stderr}`);
            }

            if (stdout) {
                whoisData = parseWhoisOutput(stdout);
                logger.info(`WHOIS parsed for ${cleanDomain} via command:`, whoisData);
            }
        } catch (cmdError) {
            logger.warn(`WHOIS command failed (${cmdError.message}), trying API fallback...`);
            
            // Fallback to API (useful for Windows or when whois is not installed)
            const apiData = await fetchWhoisViaApi(cleanDomain);
            if (apiData) {
                whoisData = apiData;
                logger.info(`WHOIS parsed for ${cleanDomain} via API:`, whoisData);
            }
        }

        // If we got data, calculate age
        if (whoisData && whoisData.creationDate) {
            try {
                const created = new Date(whoisData.creationDate);
                const now = new Date();
                const ageMs = now - created;
                whoisData.ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
            } catch {
                whoisData.ageYears = null;
            }
        }

        return whoisData || {
            creationDate: null,
            expiryDate: null,
            registrar: null,
            ageYears: null,
        };

    } catch (error) {
        logger.error(`WHOIS fetch failed for "${domain}":`, error.message);
        return {
            creationDate: null,
            expiryDate: null,
            registrar: null,
            ageYears: null,
        };
    }
}

/**
 * Parse WHOIS output to extract key fields
 */
function parseWhoisOutput(output) {
    const result = {
        creationDate: null,
        expiryDate: null,
        registrar: null,
        ageYears: null,
    };

    if (!output) return result;

    // Common patterns for creation date
    const creationPatterns = [
        /Creation Date:\s*(.+)/i,
        /Created Date:\s*(.+)/i,
        /Domain Name Commencement Date:\s*(.+)/i,
        /Created:\s*(.+)/i,
        /Registration Date:\s*(.+)/i,
        /created:\s*(.+)/i,
    ];

    // Common patterns for expiry date
    const expiryPatterns = [
        /Registry Expiry Date:\s*(.+)/i,
        /Expiration Date:\s*(.+)/i,
        /Expiry Date:\s*(.+)/i,
        /Expires:\s*(.+)/i,
        /paid-till:\s*(.+)/i,
    ];

    // Common patterns for registrar
    const registrarPatterns = [
        /Registrar:\s*(.+)/i,
        /Sponsoring Registrar:\s*(.+)/i,
        /registrar:\s*(.+)/i,
    ];

    // Extract creation date
    for (const pattern of creationPatterns) {
        const match = output.match(pattern);
        if (match) {
            result.creationDate = match[1].trim();
            break;
        }
    }

    // Extract expiry date
    for (const pattern of expiryPatterns) {
        const match = output.match(pattern);
        if (match) {
            result.expiryDate = match[1].trim();
            break;
        }
    }

    // Extract registrar
    for (const pattern of registrarPatterns) {
        const match = output.match(pattern);
        if (match) {
            result.registrar = match[1].trim();
            break;
        }
    }

    return result;
}

export default {
    fetchWhoisData,
};
