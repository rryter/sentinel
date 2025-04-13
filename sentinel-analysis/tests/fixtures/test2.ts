import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'app-list',
    template: `
        <ul>
            <li *ngFor="let item of items">{{ item }}</li>
        </ul>
    `
})
export class ListComponent {
    @Input() items: string[] = [];
    @Output() itemSelected = new EventEmitter<string>();
    @Input() title: string;
    @Input() description: string;
    @Output() refresh = new EventEmitter<void>();

    constructor() {
        this.title = 'Default List';
        this.description = '';
    }

    @Input() set config(value: any) {
        this._config = value;
    }
    private _config: any;
} 