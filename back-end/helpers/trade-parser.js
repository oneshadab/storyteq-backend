import { Trade } from '../entities/trade.js';

export class ParseError extends Error {}

export class TradeParser {
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
            throw new ParseError('Invalid line format');
        }

        const [timestamp, company, orderType, quantity] = parts;
        if (orderType !== 'D' && orderType !== 'F') {
            throw new ParseError('Invalid order type');
        }

        return new Trade(new Date(timestamp), company, orderType, parseInt(quantity));
    }
}
