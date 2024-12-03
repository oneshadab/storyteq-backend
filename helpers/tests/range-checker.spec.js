import { Trade } from '../../entities/trade';
import { RangeChecker } from '../range-checker';

describe('RangeChecker', () => {
    it('should calculate the cancellation ratio correctly', () => {
        const checker = new RangeChecker(1000, 0.5);
        checker.add(new Trade(new Date('2024-01-01'), 'Company', 'D', 10));
        checker.add(new Trade(new Date('2024-01-01'), 'Company', 'F', 30));
        expect(checker.cancellationRatio).toBe(0.75);
    });

    it('should check if a trade is outside the time range', () => {
        const checker = new RangeChecker(1000, 0.5);
        checker.add(new Trade(new Date('2024-01-01'), 'Company', 'D', 100));
        expect(checker.isOutsideTimeRange(new Trade(new Date('2024-01-02'), 'Company', 'D', 100))).toBe(true);
        expect(checker.isOutsideTimeRange(new Trade(new Date('2024-01-01'), 'Company', 'D', 100))).toBe(false);
    });

    it('should check for excessive cancelling', () => {
        const checker = new RangeChecker(1000, 0.5);
        checker.add(new Trade(new Date('2024-01-01'), 'Company', 'D', 100));
        checker.add(new Trade(new Date('2024-01-01'), 'Company', 'F', 100));
        expect(checker.checkForExcessiveCancelling()).toBe(false);

        checker.add(new Trade(new Date('2024-01-01'), 'Company', 'F', 100));
        expect(checker.checkForExcessiveCancelling()).toBe(true);
    });

});
