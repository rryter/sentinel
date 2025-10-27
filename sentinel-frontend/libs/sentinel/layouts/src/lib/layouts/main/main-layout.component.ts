import { HlmButton } from '@spartan-ng/helm/button';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { RoutingService } from '@shared/ui-custom';

@Component({
  selector: 'lib-main-layout',
  imports: [
    CommonModule,
    RouterModule,
    HlmButton,
    NgIcon,
    HlmIcon,
    HlmSeparator,
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
