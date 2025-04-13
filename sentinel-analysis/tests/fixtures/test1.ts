import { Component, Input, Output, EventEmitter, ViewChild, ContentChild } from '@angular/core';

@Component({
    selector: 'app-test',
    template: `
        <div>Test Component</div>
    `
})
export class TestComponent {
    @Input() prop1: string;
    @Input('alias') prop2: number;
    @Output() event1 = new EventEmitter<void>();
    @ViewChild('ref') child: any;
    @ContentChild('content') content: any;

    @Input() prop3: boolean;
    @Output() event2 = new EventEmitter<string>();
    
    constructor() {
        this.prop1 = '';
        this.prop2 = 0;
        this.prop3 = false;
    }
} 