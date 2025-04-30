import { Component, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'sentinel';
  projectId?: string;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {}

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
