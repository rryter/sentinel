import { Injectable } from '@angular/core';
import { BehaviorSubject, map, merge, of, switchMap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ErrorService {
  private errorSubject = new BehaviorSubject<string[]>([]);

  errors$ = this.errorSubject.pipe(
    switchMap((errors) => {
      if (errors.length === 0) {
        return of([]);
      }
      // If we have errors, start a timer to clear them
      return merge(of(errors), timer(5000).pipe(map(() => [])));
    }),
  );

  showErrors(errors: string | string[]) {
    const errorArray = Array.isArray(errors) ? errors : [errors];
    this.errorSubject.next(errorArray);
  }

  clearErrors() {
    this.errorSubject.next([]);
  }
}
