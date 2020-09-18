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
    return _.find(this.items, { id: id });
  }
}

export class LocationLookupItem {
  id: string = '';
  name: string = '';
  children: LocationLookupItem[] = [];
  parent?: LocationLookupItem;

  lookup: LocationLookup;

  constructor(init?: Partial<LocationLookupItem>) {
    Object.assign(this, init);
  }
}

export class ForecastDateLookup {
  items: moment.Moment[];

  constructor(items: moment.Moment[]){
    this.items = _.orderBy(items, x => x.toDate(), 'desc') || [];
  }

  get maximum(): moment.Moment {
    return _.head(this.items);
  }

  get minimum(): moment.Moment {
    return _.last(this.items);
  }

  getIndex(item: moment.Moment) : number {
    return _.findIndex(this.items, x => x.isSame(item));
  }
}
