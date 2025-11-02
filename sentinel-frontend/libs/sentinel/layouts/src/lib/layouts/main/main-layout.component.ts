import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RoutingService } from '@shared/ui-custom';
import { HlmButton } from '@spartan-ng/helm/button';
import { SidebarNavComponent } from '../../components/sidebar-nav/sidebar-nav.component';

@Component({
  selector: 'lib-main-layout',
  imports: [CommonModule, RouterModule, HlmButton, SidebarNavComponent],
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
