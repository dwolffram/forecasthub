import { DecimalPipe } from '@angular/common';

export class NumberHelper {
    private static numberPipe = new DecimalPipe('en');

    static round(value: number, digits: number = 2): number{
        const exp = Math.pow(10, digits);
        return Math.round((value + Number.EPSILON) * exp) / exp;
    }

    static formatDecimal(value: number, digits: number = 2): string {
        return this.numberPipe.transform(this.round(value, digits));
    }

    static formatInt(value: number): string {
        value = NumberHelper.round(value, 0);
        return this.numberPipe.transform(value);
    }
}
