import { Trade } from '../entities/trade.js';

/**
 * Checker to hold the state while processing trades for a single company.
 *
 * SIDE NOTE: Naming things is quite difficult
 */
export class RangeChecker {
    constructor(timeRange, cancellationRatioThreshold) {
        this.timeRange = timeRange;
        this.cancellationRatioThreshold = cancellationRatioThreshold;

        this.trades = [];
        this.total = {
            D: 0,
            F: 0,
        };
        this.checkFailed = false;
    }

    /**
     * @param {Trade} trade
     */
    add(trade) {
        this.total[trade.orderType] += trade.quantity;
        this.trades.push(trade);
    }

    removeOldest() {
        this.total[this.oldest.orderType] -= this.oldest.quantity;
        this.trades.shift();
    }

    /**
     * @param {Trade} trade
     * @returns {boolean}
     */
    isOutsideTimeRange(trade) {
        return this.oldest && trade.timestamp.getTime() - this.oldest.timestamp.getTime() > this.timeRange;
    }

    /**
     * @returns {boolean}
     */
    checkForExcessiveCancelling() {
        return (this.checkFailed ||= this.cancellationRatio > this.cancellationRatioThreshold);
    }

    /**
     * @returns {Trade|undefined}
     */
    get oldest() {
        return this.trades[0];
    }

    /**
     * @returns {number}
     */
    get totalCancelled() {
        return this.total.F;
    }

    /**
     * @returns {number}
     */
    get totalNew() {
        return this.total.D;
    }

    /**
     * @returns {number}
     */
    get cancellationRatio() {
        return this.totalCancelled / (this.totalNew + this.totalCancelled);
    }
}
