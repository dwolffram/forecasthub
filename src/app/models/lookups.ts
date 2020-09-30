import * as _ from 'lodash';

export enum LocationId {
  Germany = 'GM',
  Poland = 'PL'
}


export class LocationLookup {
  items: LocationLookupItem[];

  constructor(items: LocationLookupItem[]) {
    this.items = items || [];
  }

  get(id: string): LocationLookupItem {
    return _.find(_.flatMap(this.items, i => [i, ...i.children]), { id: id });
  }
}

export class LocationLookupItem {
  id: string = '';
  name: string = '';
  population: number;
  children: LocationLookupItem[] = [];
  parent?: LocationLookupItem;

  lookup: LocationLookup;

  constructor(init?: Partial<LocationLookupItem>) {
    Object.assign(this, init);
  }
}

export class ForecastDateLookup {
  items: moment.Moment[];

  constructor(items: moment.Moment[]) {
    this.items = _.orderBy(items, x => x.toDate(), 'desc') || [];
  }

  get maximum(): moment.Moment {
    return _.head(this.items);
  }

  get minimum(): moment.Moment {
    return _.last(this.items);
  }

  getIndex(item: moment.Moment): number {
    return _.findIndex(this.items, x => x.isSame(item));
  }

  getDateByDir(from: moment.Moment, dir: 'prev' | 'next') {
    let dateUpdate = this.maximum;
    const index = this.getIndex(from);
    if (index >= 0) {
      const newIndex = dir === 'next'
        ? (index + 1) % this.items.length
        : (index - 1 < 0 ? this.items.length - 1 : index - 1);
      dateUpdate = this.items[newIndex];
    }
    return dateUpdate;
  }

  getClosest(date: moment.Moment) {
    return _.minBy(_.map(this.items, x => ({ date: x, diff: Math.abs(x.diff(date)) })), x => x.diff).date;
  }
}
