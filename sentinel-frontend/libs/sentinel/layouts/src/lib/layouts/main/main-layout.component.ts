import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { RoutingService } from '@shared/ui-custom';
import { BrnSeparatorComponent } from '@spartan-ng/brain/separator';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { HlmSeparatorDirective } from '@spartan-ng/ui-separator-helm';
@Component({
  selector: 'lib-main-layout',
  imports: [
    CommonModule,
    RouterModule,
    HlmButtonDirective,
    NgIcon,
    HlmIconDirective,
    BrnSeparatorComponent,
    HlmSeparatorDirective,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  projectId = input.required<number>();
  routerService = inject(RoutingService);
  ngOnInit() {
    this.routerService.projectId = this.projectId();
  }
}
