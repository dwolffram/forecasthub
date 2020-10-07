import * as moment from 'moment';

export class DateHelper {
  static formatTicks(ticks: number) {
    return this.format(moment(ticks));
  }

  static format(date: moment.Moment): string {
      return date.format('YYYY-MM-DD');
  }

  static formatDate(date: Date): string {
      return this.format(moment(date));
  }
}
