import Razorpay from 'razorpay';
import logger from '../utils/logger.js';

class RazorpayService {
    constructor() {
        this._instance = null;
    }

    get instance() {
        if (!this._instance) {
            this._instance = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });
        }
        return this._instance;
    }

    /**
     * Create a new subscription
     */
    async createSubscription(planId, customerDetails = {}) {
        try {
            const subscription = await this.instance.subscriptions.create({
                plan_id: planId,
                total_count: 120, // 10 years
                quantity: 1,
                customer_notify: 1,
                notes: customerDetails
            });
            return subscription;
        } catch (error) {
            logger.error('Razorpay createSubscription failed:', error);
            throw error;
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(body, signature, secret) {
        return Razorpay.validateWebhookSignature(body, signature, secret);
    }
}

export default new RazorpayService();
