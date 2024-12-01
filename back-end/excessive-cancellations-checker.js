const fs = require('fs');
const readline = require('readline');

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
        const trades = await this.parseTradeFile();
        const companiesMap = new Map();

        // Group trades by company
        trades.forEach((trade) => {
            if (!companiesMap.has(trade.company)) {
                companiesMap.set(trade.company, []);
            }
            companiesMap.get(trade.company).push(trade);
        });

        // Check each company for excessive cancellations
        return Array.from(companiesMap)
            .filter(([company, trades]) => this.isExcessiveCancelling(trades))
            .map(([company]) => company);
    }

    /**
     * Returns the total number of companies that are not involved in any excessive cancelling.
     * Note this should always resolve a number or throw error.
     *
     * @returns {Promise<number>}
     */
    async totalNumberOfWellBehavedCompanies() {
        const trades = await this.parseTradeFile();
        const uniqueCompanies = new Set(trades.map((trade) => trade.company));
        const excessiveCompanies =
            await this.companiesInvolvedInExcessiveCancellations();

        return uniqueCompanies.size - excessiveCompanies.length;
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
    isExcessiveCancelling(trades) {
        trades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        let windowStart = 0;
        let newOrdersQty = 0;
        let cancelsQty = 0;

        for (let i = 0; i < trades.length; i++) {
            // Add new trade to window
            if (trades[i].orderType === 'D') {
                newOrdersQty += trades[i].quantity;
            } else {
                cancelsQty += trades[i].quantity;
            }

            // Remove trades outside 60-second window
            while (
                windowStart <= i &&
                trades[i].timestamp.getTime() -
                trades[windowStart].timestamp.getTime() >
                60000
            ) {
                if (trades[windowStart].orderType === 'D') {
                    newOrdersQty -= trades[windowStart].quantity;
                } else {
                    cancelsQty -= trades[windowStart].quantity;
                }
                windowStart++;
            }

            // Check if there are any orders and if cancel ratio exceeds 1/3
            if (
                newOrdersQty > 0 &&
                cancelsQty / (newOrdersQty + cancelsQty) > 1 / 3
            ) {
                return true;
            }
        }

        return false;
    }
}

class Trade {
    /**
     * @param {Date} timestamp
     * @param {string} company
     * @param {string} orderType
     * @param {number} quantity
     */
    constructor(timestamp, company, orderType, quantity) {
        this.timestamp = timestamp;
        this.company = company;
        this.orderType = orderType;
        this.quantity = quantity;
    }
}
