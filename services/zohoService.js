/*
import axios from 'axios';
import logger from '../utils/logger.js';

class ZohoService {
    constructor() {
        this.baseUrl = 'https://subscriptions.zoho.in/api/v1';
        this.tokenUrl = 'https://accounts.zoho.in/oauth/v2/token';
        this.orgId = process.env.ZOHO_ORG_ID;
        this.clientId = process.env.ZOHO_CLIENT_ID;
        this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
        this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    }

    async getAccessToken() {
        try {
            const response = await axios.post(this.tokenUrl, null, {
                params: {
                    refresh_token: this.refreshToken,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'refresh_token'
                }
            });

            return response.data.access_token;
        } catch (error) {
            logger.error('Zoho getAccessToken failed:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Zoho');
        }
    }

    async getOrCreateCustomer(user) {
        const accessToken = await this.getAccessToken();
        
        try {
            const searchResponse = await axios.get(`${this.baseUrl}/customers`, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                    'X-com-zoho-subscriptions-organizationid': this.orgId
                },
                params: { email: user.email }
            });

            if (searchResponse.data.customers?.length > 0) {
                return searchResponse.data.customers[0].customer_id;
            }

            const createResponse = await axios.post(`${this.baseUrl}/customers`, {
                display_name: user.full_name || user.email,
                email: user.email,
            }, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                    'X-com-zoho-subscriptions-organizationid': this.orgId
                }
            });

            return createResponse.data.customer.customer_id;
        } catch (error) {
            logger.error('Zoho getOrCreateCustomer failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async createHostedPage(customerId, planCode, redirectUrl) {
        const accessToken = await this.getAccessToken();

        try {
            const response = await axios.post(`${this.baseUrl}/hostedpages/newsubscription`, {
                customer_id: customerId,
                plan: {
                    plan_code: planCode
                },
                redirect_url: redirectUrl
            }, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                    'X-com-zoho-subscriptions-organizationid': this.orgId
                }
            });

            return response.data.hostedpage;
        } catch (error) {
            logger.error('Zoho createHostedPage failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async getSubscription(subscriptionId) {
        const accessToken = await this.getAccessToken();

        try {
            const response = await axios.get(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                    'X-com-zoho-subscriptions-organizationid': this.orgId
                }
            });

            return response.data.subscription;
        } catch (error) {
            logger.error('Zoho getSubscription failed:', error.response?.data || error.message);
            throw error;
        }
    }
}

export default new ZohoService();
*/
