const readline = require('readline');
const fs = require('fs');

const Trade = require('../entities/trade');

class TradeParser {
    static ParseError = class extends Error {};

    constructor(filePath) {
        this.filePath = filePath;
    }


    /**
     * Parses a single line of the trade file and returns a trade object.
     * @param {string} line
     * @returns {Trade}
     */
    parseTrade(line) {
        const parts = line.split(',');
        if (parts.length !== 4) {
            throw new TradeParser.ParseError('Invalid line format');
        }

        const [timestamp, company, orderType, quantity] = parts;
        if (orderType !== 'D' && orderType !== 'F') {
            throw new TradeParser.ParseError('Invalid order type');
        }

        return new Trade(new Date(timestamp), company, orderType, parseInt(quantity));
    }
}

module.exports = TradeParser;
