const Trade = require('./entities/trade');
const TradeParser = require('./helpers/trade-parser');

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
        const trades = await new TradeParser(this.filePath).parseTradeFile();

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
        const trades = await new TradeParser(this.filePath).parseTradeFile();
        const uniqueCompanies = new Set(trades.map((trade) => trade.company));
        const excessiveCompanies = await this.companiesInvolvedInExcessiveCancellations();

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
    hasExcessiveCancelling(trades) {
        let windowStart = 0;
        let totalOrders = 0;
        let totalCancels = 0;

        for (let i = 0; i < trades.length; i++) {
            // Add new trade to window
            if (trades[i].orderType === 'D') {
                totalOrders += trades[i].quantity;
            } else {
                totalCancels += trades[i].quantity;
            }

            // Remove trades outside 60-second window
            while (
                windowStart <= i &&
                trades[i].timestamp.getTime() -
                    trades[windowStart].timestamp.getTime() >
                    60000
            ) {
                if (trades[windowStart].orderType === 'D') {
                    totalOrders -= trades[windowStart].quantity;
                } else {
                    totalCancels -= trades[windowStart].quantity;
                }
                windowStart++;
            }

            // Check if there are any orders and if cancel ratio exceeds 1/3
            if (totalCancels > 0 && totalCancels / (totalOrders + totalCancels) > 1 / 3) {
                return true;
            }
        }

        return false;
    }
}

