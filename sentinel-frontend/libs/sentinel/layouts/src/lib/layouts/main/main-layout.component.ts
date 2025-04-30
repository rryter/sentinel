import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { BrnSeparatorComponent } from '@spartan-ng/brain/separator';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { HlmSeparatorDirective } from '@spartan-ng/ui-separator-helm';
import { filter, map } from 'rxjs';

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
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  projectId: string = '';

  ngOnInit() {
    // Subscribe to route changes and extract projectId
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => {
          let route = this.route.firstChild;
          while (route?.firstChild) {
            route = route.firstChild;
          }
          return route?.snapshot.params['projectId'];
        }),
      )
      .subscribe((projectId) => {
        this.projectId = projectId;
      });
  }
}
