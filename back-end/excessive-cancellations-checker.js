import fs from 'fs';
import readline from 'readline';

import { Trade } from './entities/trade.js';
import { TradeParser, ParseError } from './helpers/trade-parser.js';

export class ExcessiveCancellationsChecker {
    /**
     * We provide a path to a file when initiating the class
     * you have to use it in your methods to solve the task
     *
     * @param {string} filePath
     */
    constructor(filePath) {
        this.filePath = filePath;
        this.checkers = new Map();
    }

    /**
     * Returns the list of companies that are involved in excessive cancelling.
     * Note this should always resolve an array or throw error.
     *
     * @returns {Promise<string[]>}
     */
    async companiesInvolvedInExcessiveCancellations() {
        await this.processTradeFile();
        return this.excessiveCancelledCompanies;
    }

    /**
     * Returns the total number of companies that are not involved in any excessive cancelling.
     * Note this should always resolve a number or throw error.
     *
     * @returns {Promise<number>}
     */
    async totalNumberOfWellBehavedCompanies() {
        await this.processTradeFile();
        return this.companies.length - this.excessiveCancelledCompanies.length;
    }

    reset() {
        this.checkers = new Map();
    }

    async processTradeFile() {
        this.reset();

        for await (const trade of this.readTrades()) {
            this.process(trade);
        }
    }

    /**
     * @param {Trade} trade
     */
    process(trade) {
        const processor = this.getOrCreateProcessor(trade.company);

        while (processor.isOutsideTimeRange(trade)) {
            processor.checkForExcessiveCancelling();
            processor.removeOldest();
        }

        processor.add(trade);
    }

    /**
     * @param {string} company
     * @returns {Checker}
     */
    getOrCreateProcessor(company) {
        const timeRange = 60 * 1000;
        const cancellationRatioThreshold = 1 / 3;

        if (!this.checkers.has(company)) {
            // Each company should have a single checker
            this.checkers.set(company, new Checker(timeRange, cancellationRatioThreshold));
        }

        return this.checkers.get(company);
    }

    /**
     * @returns {AsyncIterable<Trade>}
     */
    readTrades() {
        const parser = new TradeParser(this.filePath);
        const lineStream = readline.createInterface({
            input: fs.createReadStream(this.filePath),
            crlfDelay: Infinity,
        });

        const createStream = async function* () {
            for await (const line of lineStream) {
                try {
                    const trade = parser.parseTrade(line);
                    yield trade;
                } catch (error) {
                    if (error instanceof ParseError) {
                        // Ignore invalid lines
                        continue;
                    }
                    throw error;
                }
            }
        };

        return createStream();
    }

    /**
     * @returns {string[]}
     */
    get companies() {
        return Array.from(this.checkers.keys());
    }

    /**
     * @returns {string[]}
     */
    get excessiveCancelledCompanies() {
        return this.companies.filter((company) => this.checkers.get(company).checkForExcessiveCancelling());
    }
}

/**
 * Checker to hold the state while processing trades for a single company.
 *
 * SIDE NOTE: Naming things is quite difficult
 */
class Checker {
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
