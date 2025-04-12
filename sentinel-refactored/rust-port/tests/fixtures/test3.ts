import { Component, Input, Output, EventEmitter, ViewChildren, ContentChildren, QueryList } from '@angular/core';

@Component({
    selector: 'app-container',
    template: `
        <div class="container">
            <ng-content></ng-content>
            <div class="items">
                <div *ngFor="let item of items">
                    <ng-container [ngTemplateOutlet]="itemTemplate"
                                [ngTemplateOutletContext]="{ $implicit: item }">
                    </ng-container>
                </div>
            </div>
        </div>
    `
})
export class ContainerComponent {
    @Input() items: any[] = [];
    @Input() itemTemplate: any;
    @Output() itemClick = new EventEmitter<any>();
    
    @ViewChildren('itemRef') itemRefs: QueryList<any>;
    @ContentChildren('contentRef') contentRefs: QueryList<any>;
    
    @Input() layout: 'grid' | 'list' = 'grid';
    @Input() itemSize: 'small' | 'medium' | 'large' = 'medium';
    @Output() layoutChange = new EventEmitter<string>();
    
    @Input() set theme(value: string) {
        this._theme = value;
        this.updateTheme();
    }
    get theme(): string {
        return this._theme;
    }
    private _theme: string = 'default';
    
    private updateTheme(): void {
        // Theme update logic
    }
} 