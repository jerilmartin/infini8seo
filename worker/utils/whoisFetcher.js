import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

/**
 * WHOIS Fetcher
 * Runs OS-level whois command to get domain registration data.
 */

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

        // Try whois command
        const { stdout, stderr } = await execAsync(`whois ${cleanDomain}`, {
            timeout: 30000,
            maxBuffer: 1024 * 1024,
        });

        if (stderr && !stdout) {
            logger.warn(`WHOIS stderr: ${stderr}`);
        }

        const whoisData = parseWhoisOutput(stdout);
        logger.info(`WHOIS parsed for ${cleanDomain}:`, whoisData);

        return whoisData;
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

    // Calculate age in years
    if (result.creationDate) {
        try {
            const created = new Date(result.creationDate);
            const now = new Date();
            const ageMs = now - created;
            result.ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
        } catch {
            result.ageYears = null;
        }
    }

    return result;
}

export default {
    fetchWhoisData,
};
