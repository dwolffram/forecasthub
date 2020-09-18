import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

// TODO: Prüfen!
export function cacheTest<T>(factory: () => Observable<T>): () => Observable<T> {
  let store = null;
  return () => {
    if (store === null) {
      store = factory().pipe(shareReplay(1));
    }
    return store;
  }
}
