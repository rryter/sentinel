import { Component, OnInit, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';

interface DataItem {
    id: number;
    name: string;
    category: string;
    status: string;
    lastUpdated: string;
    [key: string]: any;
}

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private dataSubject = new BehaviorSubject<DataItem[]>([]);
    private loadingSubject = new BehaviorSubject<boolean>(false);
    private errorSubject = new BehaviorSubject<string | null>(null);

    data$ = this.dataSubject.asObservable();
    loading$ = this.loadingSubject.asObservable();
    error$ = this.errorSubject.asObservable();

    constructor(private http: HttpClient) {}

    fetchData(): Observable<DataItem[]> {
        this.loadingSubject.next(true);
        this.errorSubject.next(null);

        return this.http.get<DataItem[]>('/api/data').pipe(
            tap(data => {
                this.dataSubject.next(data);
                this.loadingSubject.next(false);
            }),
            catchError(error => {
                this.errorSubject.next(error.message);
                this.loadingSubject.next(false);
                throw error;
            })
        );
    }

    updateItem(id: number, data: Partial<DataItem>): Observable<any> {
        return this.http.put(`/api/data/${id}`, data).pipe(
            tap(() => {
                const currentData = this.dataSubject.value;
                const updatedData = currentData.map(item =>
                    item.id === id ? { ...item, ...data } : item
                );
                this.dataSubject.next(updatedData);
            })
        );
    }
}

@Component({
    selector: 'app-data-list',
    template: `
        <div class="data-list-container">
            <header class="data-list-header">
                <h1>{{ title }}</h1>
                <div class="search-container">
                    <input
                        type="text"
                        [(ngModel)]="searchTerm"
                        (ngModelChange)="onSearch($event)"
                        placeholder="Search items..."
                    />
                    <button (click)="clearSearch()">Clear</button>
                </div>
            </header>

            <div class="loading-container" *ngIf="loading$ | async">
                <mat-spinner></mat-spinner>
                <p>Loading data...</p>
            </div>

            <div class="error-container" *ngIf="error$ | async as error">
                <mat-icon>error</mat-icon>
                <p>{{ error }}</p>
                <button (click)="retryLoad()">Retry</button>
            </div>

            <div class="data-grid" *ngIf="!(loading$ | async) && !(error$ | async)">
                <div class="grid-header">
                    <div class="grid-cell" *ngFor="let header of headers">
                        {{ header }}
                        <button (click)="sort(header)">
                            <mat-icon>{{ getSortIcon(header) }}</mat-icon>
                        </button>
                    </div>
                </div>

                <div class="grid-body">
                    <div class="grid-row" *ngFor="let item of filteredData$ | async">
                        <div class="grid-cell" *ngFor="let header of headers">
                            {{ item[header] }}
                        </div>
                        <div class="grid-cell actions">
                            <button (click)="editItem(item)">Edit</button>
                            <button (click)="deleteItem(item)">Delete</button>
                        </div>
                    </div>
                </div>

                <div class="pagination">
                    <button
                        [disabled]="currentPage === 1"
                        (click)="previousPage()"
                    >
                        Previous
                    </button>
                    <span>Page {{ currentPage }} of {{ totalPages }}</span>
                    <button
                        [disabled]="currentPage === totalPages"
                        (click)="nextPage()"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .data-list-container {
            padding: 20px;
            background: #f5f5f5;
        }

        .data-list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .search-container {
            display: flex;
            gap: 10px;
        }

        .data-grid {
            background: white;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .grid-header {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            background: #f0f0f0;
            padding: 10px;
            font-weight: bold;
        }

        .grid-body {
            max-height: 500px;
            overflow-y: auto;
        }

        .grid-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            padding: 10px;
            border-bottom: 1px solid #eee;
        }

        .grid-cell {
            padding: 5px;
        }

        .actions {
            display: flex;
            gap: 5px;
        }

        .pagination {
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 10px;
        }

        .loading-container,
        .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
        }
    `]
})
export class DataListComponent implements OnInit {
    title = 'Data Management';
    headers: string[] = ['id', 'name', 'category', 'status', 'lastUpdated'];
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;
    searchTerm = '';
    sortConfig: { field: string; direction: 'asc' | 'desc' } | null = null;

    private searchSubject = new BehaviorSubject<string>('');
    search$ = this.searchSubject.asObservable();

    loading$ = this.dataService.loading$;
    error$ = this.dataService.error$;

    filteredData$ = combineLatest([
        this.dataService.data$,
        this.search$
    ]).pipe(
        map(([data, search]) => {
            let filtered = data;

            if (search) {
                const searchLower = search.toLowerCase();
                filtered = data.filter(item =>
                    Object.values(item).some(
                        value =>
                            value &&
                            value.toString().toLowerCase().includes(searchLower)
                    )
                );
            }

            if (this.sortConfig) {
                const { field, direction } = this.sortConfig;
                filtered = [...filtered].sort((a, b) => {
                    const aVal = a[field];
                    const bVal = b[field];
                    return direction === 'asc'
                        ? aVal > bVal ? 1 : -1
                        : aVal < bVal ? 1 : -1;
                });
            }

            this.totalPages = Math.ceil(filtered.length / this.pageSize);

            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return filtered.slice(start, end);
        })
    );

    constructor(private dataService: DataService) {}

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.dataService.fetchData().subscribe();
    }

    onSearch(term: string): void {
        this.currentPage = 1;
        this.searchSubject.next(term);
    }

    clearSearch(): void {
        this.searchTerm = '';
        this.onSearch('');
    }

    sort(field: string): void {
        if (!this.sortConfig || this.sortConfig.field !== field) {
            this.sortConfig = { field, direction: 'asc' };
        } else {
            this.sortConfig = {
                field,
                direction: this.sortConfig.direction === 'asc' ? 'desc' : 'asc'
            };
        }
        this.searchSubject.next(this.searchTerm);
    }

    getSortIcon(field: string): string {
        if (!this.sortConfig || this.sortConfig.field !== field) {
            return 'sort';
        }
        return this.sortConfig.direction === 'asc'
            ? 'arrow_upward'
            : 'arrow_downward';
    }

    editItem(item: DataItem): void {
        console.log('Edit item:', item);
    }

    deleteItem(item: DataItem): void {
        console.log('Delete item:', item);
    }

    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.searchSubject.next(this.searchTerm);
        }
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.searchSubject.next(this.searchTerm);
        }
    }

    retryLoad(): void {
        this.loadData();
    }
} 