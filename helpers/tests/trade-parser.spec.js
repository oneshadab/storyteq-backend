import { Trade } from "../../entities/trade";
import { TradeParser, ParseError } from "../trade-parser";

describe('TradeParser', () => {
    it('should parse a valid line', () => {
        const parser = new TradeParser();
        const trade = parser.parseTrade('2024-01-01,Company,D,100');
        expect(trade).toEqual(new Trade(new Date('2024-01-01'), 'Company', 'D', 100));
    });

    it('should throw an error for an invalid line', () => {
        const parser = new TradeParser();
        expect(() => parser.parseTrade('2024-01-01,100')).toThrow(ParseError);
    });

    it('should throw an error for an invalid timestamp', () => {
        const parser = new TradeParser();
        expect(() => parser.parseTrade('1232024-01-01,Company,D,100')).toThrow(ParseError);
    });

    it('should throw an error for an invalid order type', () => {
        const parser = new TradeParser();
        expect(() => parser.parseTrade('2024-01-01,Company,X,100')).toThrow(ParseError);
    });

    it('should throw an error for an invalid quantity', () => {
        const parser = new TradeParser();
        expect(() => parser.parseTrade('2024-01-01,Company,D,abc')).toThrow(ParseError);
    });
});
