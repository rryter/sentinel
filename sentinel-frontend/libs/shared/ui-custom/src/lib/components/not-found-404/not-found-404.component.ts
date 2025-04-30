import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';

@Component({
  selector: 'saas-not-found-404',
  imports: [CommonModule, RouterLink, HlmButtonDirective],
  templateUrl: './not-found-404.component.html',
  styleUrl: './not-found-404.component.css',
})
export class NotFound404Component {}
