import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'lib-auth-component',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './auth-component.component.html',
  styleUrl: './auth-component.component.scss',
})
export class AuthComponentComponent {}
