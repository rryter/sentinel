import { HlmButton } from '@spartan-ng/helm/button';
import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'saas-not-found-404',
  imports: [CommonModule, RouterLink, HlmButton],
  templateUrl: './not-found-404.component.html',
  styleUrl: './not-found-404.component.css',
})
export class NotFound404Component {
  private readonly location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}
