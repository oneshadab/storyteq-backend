const readline = require('readline');
const fs = require('fs');

const Trade = require('../entities/trade');

class TradeParser {
    constructor(filePath) {
        this.filePath = filePath;
    }

    /**
     * @returns {Promise<Trade[]>} 
     */
    async parseTradeFile() {
        const trades = [];

        for await (const line of this.readLines()) {
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
     * @returns {AsyncIterable<string>} 
     */
    readLines() {
        return readline.createInterface({
            input: fs.createReadStream(this.filePath),
            crlfDelay: Infinity,
        });
    }

    /**
     * Parses a single line of the trade file and returns a trade object.
     * @param {string} line
     * @returns {Trade}
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

        return new Trade(new Date(timestamp), company, orderType, parseInt(quantity));
    }
}

module.exports = TradeParser;
