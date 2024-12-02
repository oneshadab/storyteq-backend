import fs from 'fs';
import readline from 'readline';

import { Trade } from './entities/trade.js';
import { TradeParser, ParseError } from './helpers/trade-parser.js';
import { RangeChecker } from './helpers/range-checker.js';
import * as config from './config.js';

export class ExcessiveCancellationsChecker {
    /**
     * We provide a path to a file when initiating the class
     * you have to use it in your methods to solve the task
     *
     * @param {string} filePath
     * @param {number|undefined} timeRange
     * @param {number|undefined} cancellationRatioThreshold
     */
    constructor(filePath, timeRange, cancellationRatioThreshold) {
        this.filePath = filePath;
        this.timeRange = timeRange ?? config.DEFAULT_TIME_RANGE;
        this.cancellationRatioThreshold = cancellationRatioThreshold ?? config.DEFAULT_CANCELLATION_RATIO_THRESHOLD;
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
        const checker = this.getOrCreateChecker(trade.company);

        while (checker.isOutsideTimeRange(trade)) {
            checker.checkForExcessiveCancelling();
            checker.removeOldest();
        }

        checker.add(trade);
    }

    /**
     * @param {string} company
     * @returns {RangeChecker}
     */
    getOrCreateChecker(company) {
        if (!this.checkers.has(company)) {
            // Each company should have a single checker
            this.checkers.set(company, new RangeChecker(this.timeRange, this.cancellationRatioThreshold));
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
