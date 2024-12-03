import { ExcessiveCancellationsChecker } from '../excessive-cancellations-checker.js';
import { TradeParser, ParseError } from '../helpers/trade-parser.js';

const checker = new ExcessiveCancellationsChecker('./data/trades.csv');

describe('Excessive Cancellations Test', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('calculate', () => {
        it('should check for companies that are involved in excessive cancelling', async () => {
            const companiesList = await checker.companiesInvolvedInExcessiveCancellations();
            expect(companiesList).toEqual(['Ape accountants', 'Cauldron cooking']);
        });

        it('should check for the total number of well behaved companies', async () => {
            const wellBehavedCompanies = await checker.totalNumberOfWellBehavedCompanies();
            expect(wellBehavedCompanies).toEqual(12);
        });

        it('should ignore invalid lines', async () => {
            jest.spyOn(TradeParser.prototype, 'parseTrade').mockImplementation(() => {
                throw new ParseError();
            });

            await expect(checker.totalNumberOfWellBehavedCompanies()).resolves.not.toThrow();
        });

        it('should bubble up other errors', async () => {
            const customError = new Error('test error');

            jest.spyOn(TradeParser.prototype, 'parseTrade').mockImplementation(() => {
                throw customError;
            });

            await expect(checker.totalNumberOfWellBehavedCompanies()).rejects.toThrow(customError);
        });
    });
});
