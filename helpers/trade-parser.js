import { Trade } from '../entities/trade.js';

export class ParseError extends Error {}

export class TradeParser {
    /**
     * @param {string} line
     * @returns {Trade}
     */
    parseTrade(line) {
        const parts = line.split(',');
        if (parts.length !== 4) {
            throw new ParseError('Invalid line format');
        }

        const [timestamp, company, orderType, quantity] = parts;
        return new Trade(
            this.parseTimestamp(timestamp),
            this.parseCompany(company),
            this.parseOrderType(orderType),
            this.parseQuantity(quantity)
        );
    }

    /**
     * @param {string} timestamp
     * @returns {Date}
     */
    parseTimestamp(timestamp) {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            throw new ParseError('Invalid timestamp');
        }
        return date;
    }

    /**
     * @param {string} company
     * @returns {string}
     */
    parseCompany(company) {
        // TODO: Validate company format
        return company;
    }

    /**
     * @param {string} orderType
     * @returns {string}
     */
    parseOrderType(orderType) {
        if (!['D', 'F'].includes(orderType)) {
            throw new ParseError('Invalid order type');
        }
        return orderType;
    }

    /**
     * @param {string} quantity
     * @returns {number}
     */
    parseQuantity(quantity) {
        const num = parseInt(quantity);
        if (isNaN(num)) {
            throw new ParseError('Invalid quantity');
        }
        return num;
    }
}
