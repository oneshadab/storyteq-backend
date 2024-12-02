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
    }

    /**
     * Returns the list of companies that are involved in excessive cancelling.
     * Note this should always resolve an array or throw error.
     *
     * @returns {Promise<string[]>}
     */
    async companiesInvolvedInExcessiveCancellations() {
        const trades = await this.getTrades();

        const tradesByCompany = trades.reduce((groups, trade) => {
            (groups[trade.company] ??= []).push(trade);
            return groups;
        }, {});

        const companies = Object.keys(tradesByCompany);
        return companies.filter((company) => this.hasExcessiveCancelling(tradesByCompany[company]));
    }

    /**
     * Returns the total number of companies that are not involved in any excessive cancelling.
     * Note this should always resolve a number or throw error.
     *
     * @returns {Promise<number>}
     */
    async totalNumberOfWellBehavedCompanies() {
        const trades = await this.getTrades();
        const uniqueCompanies = new Set(trades.map((trade) => trade.company));
        const excessiveCompanies = await this.companiesInvolvedInExcessiveCancellations();

        return uniqueCompanies.size - excessiveCompanies.length;
    }

    async getTrades() {
        const trades = [];
        for await (const trade of this.getTradeStream()) {
            trades.push(trade);
        }
        return trades;
    }

    getTradeStream() {
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
     * @returns {Promise<Object[]>}
     */
    async parseTradeFile() {
        const trades = [];

        const lineReader = readline.createInterface({
            input: fs.createReadStream(this.filePath),
            crlfDelay: Infinity,
        });

        for await (const line of lineReader) {
            try {
                const trade = this.parseTrade(line);
                trades.push(trade);
            } catch (error) {
                console.error(`Error parsing trade ${line}`, error);
            }
        }

        return trades;
    }

    /**
     * @param {string} line
     * @returns {Object}
     */
    parseTrade(line) {
        const parts = line.split(',');
        if (parts.length !== 4) {
            throw new Error('Invalid line format');
        }

        const [timestamp, company, orderType, quantity] = parts;
        if (orderType !== 'D' && orderType !== 'F') {
            throw new Error('Invalid order type');
        }

        return new Trade(
            new Date(timestamp),
            company,
            orderType,
            parseInt(quantity)
        );
    }

    /**
     * @param {Trade[]} trades
     * @returns {boolean}
     */
    hasExcessiveCancelling(trades) {
        const timeRange = 60 * 1000;
        const cancellationRatioThreshold = 1 / 3;

        const batch = new Batch(timeRange, cancellationRatioThreshold);

        for (const trade of trades) {
            while (batch.isOutsideTimeRange(trade)) {
                batch.checkForExcessiveCancelling();
                batch.removeOldest();
            }

            batch.add(trade);
        }

        batch.checkForExcessiveCancelling();
        return batch.checkFailed;
    }
}

class Batch {
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
        this.checkFailed ||= this.cancellationRatio > this.cancellationRatioThreshold;
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

