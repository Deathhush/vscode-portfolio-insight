import { ExchangeRateData } from './interfaces';

/**
 * ExchangeRate class represents a collection of exchange rate data for a specific currency.
 * It provides methods to find the closest exchange rate to a target date.
 */
export class ExchangeRate {
    private rates: ExchangeRateData[];

    constructor(public currency: string, rates: ExchangeRateData[]) {
        // Sort rates by date for efficient searching
        this.rates = [...rates].sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    }

    /**
     * Find the exchange rate closest to the target date
     * @param targetDate The target date to find the closest rate for
     * @returns The exchange rate closest to the target date, or undefined if no rates available
     */
    public findRateClosestTo(targetDate: string): number | undefined {
        if (this.rates.length === 0) {
            return undefined;
        }

        const targetTime = new Date(targetDate).getTime();
        let closestRate: ExchangeRateData | undefined;
        let minTimeDiff = Infinity;

        for (const rate of this.rates) {
            const rateTime = new Date(rate.date!).getTime();
            const timeDiff = Math.abs(targetTime - rateTime);
            
            if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestRate = rate;
            }
        }

        return closestRate?.rate;
    }
}
