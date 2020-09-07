export class LocationLookup {
  id: string = '';
  name: string = '';
  children: LocationLookup[] = [];

  constructor(init?: Partial<LocationLookup>) {
    Object.assign(this, init);
  }


}
