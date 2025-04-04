// This file imports from rxjs
import { Observable, Subject } from "rxjs";
import { map, filter, catchError } from "rxjs/operators";

class RxjsExample {
  private dataSubject = new Subject<number[]>();
  public data$ = this.dataSubject.asObservable();

  constructor() {
    // Example of using rxjs operators
    this.data$
      .pipe(
        filter((numbers) => numbers.length > 0),
        map((numbers) => numbers.map((n) => n * 2)),
        catchError((err) => {
          console.error("Error in data stream", err);
          return new Observable<number[]>();
        })
      )
      .subscribe((result) => console.log("Processed data:", result));
  }

  updateData(newData: number[]) {
    this.dataSubject.next(newData);
  }
}
