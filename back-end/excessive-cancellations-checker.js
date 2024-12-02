import fs from 'fs';
import readline from 'readline';

import { Trade } from './entities/trade.js';
import { TradeParser, ParseError } from './helpers/trade-parser.js';

export class ExcessiveCancellationsChecker {
    /**
     * We provide a path to a file when initiating the class
     * you have to use it in your methods to solve the task
     *
     * @param {string} filePath - The path to the trade file.
     */
    constructor(filePath) {
        this.filePath = filePath;
        this.processors = new Map();
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
        this.processors = new Map();
    }

    async processTradeFile() {
        this.reset();

        for await (const trade of this.readTrades()) {
            this.process(trade);
        }
    }

    /**
     * @param {Trade} trade - The trade object to process.
     */
    process(trade) {
        const timeRange = 60 * 1000;
        const cancellationRatioThreshold = 1 / 3;

        if (!this.processors.has(trade.company)) {
            // Each company should have a single processor
            this.processors.set(trade.company, new Processor(timeRange, cancellationRatioThreshold));
        }

        const processor = this.processors.get(trade.company);

        while (processor.isOutsideTimeRange(trade)) {
            processor.checkForExcessiveCancelling();
            processor.removeOldest();
        }

        processor.add(trade);
    }

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

    get companies() {
        return Array.from(this.processors.keys());
    }

    get excessiveCancelledCompanies() {
        return this.companies.filter((company) => this.processors.get(company).checkForExcessiveCancelling());
    }
}

/**
 * Processor to hold the state while processing trades for a single company.
 * 
 * SIDE NOTE: Naming things is quite difficult
 */
class Processor {
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

    add(trade) {
        this.total[trade.orderType] += trade.quantity;
        this.trades.push(trade);
    }

    removeOldest() {
        this.total[this.oldest.orderType] -= this.oldest.quantity;
        this.trades.shift();
    }

    isOutsideTimeRange(trade) {
        return this.oldest && trade.timestamp.getTime() - this.oldest.timestamp.getTime() > this.timeRange;
    }

    checkForExcessiveCancelling() {
        return (this.checkFailed ||= this.cancellationRatio > this.cancellationRatioThreshold);
    }

    get oldest() {
        return this.trades[0];
    }

    get totalCancelled() {
        return this.total.F;
    }

    get totalNew() {
        return this.total.D;
    }

    get cancellationRatio() {
        return this.totalCancelled / (this.totalNew + this.totalCancelled);
    }
}
