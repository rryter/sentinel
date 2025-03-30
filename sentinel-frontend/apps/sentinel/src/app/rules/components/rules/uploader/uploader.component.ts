import {
  ChangeDetectionStrategy,
  Component,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { RouterModule } from '@angular/router';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';

@Component({
  selector: 'app-uploader',
  imports: [CommonModule, HttpClientModule, RouterModule, HlmButtonDirective],
  templateUrl: './uploader.component.html',
  styleUrl: './uploader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploaderComponent {
  selectedFiles: File[] = [];
  isDragging = false;
  isUploading = false;
  errorMessage = '';
  successMessage = '';

  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);

  /**
   * Handles file selection from the file input
   */
  handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(Array.from(input.files));
    }
  }

  /**
   * Handles the dragover event
   */
  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  /**
   * Handles the dragleave event
   */
  handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  /**
   * Handles the drop event
   */
  handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  /**
   * Processes the selected files
   */
  private processFiles(files: File[]): void {
    // Reset messages
    this.errorMessage = '';
    this.successMessage = '';

    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const validExtensions = ['.go', '.md', '.json', '.yaml', '.yml', '.txt'];

    // Filter out invalid files
    const validFiles: File[] = [];
    let hasInvalidFiles = false;

    for (const file of files) {
      // Check file size
      if (file.size > maxSize) {
        hasInvalidFiles = true;
        continue;
      }

      // Check file extension
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        hasInvalidFiles = true;
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      this.errorMessage =
        'No valid files selected. Please upload .go, .md, .json, .yaml, or .txt files under 10MB.';
      return;
    }

    if (hasInvalidFiles) {
      this.errorMessage =
        'Some files were skipped due to invalid type or size.';
    }

    this.selectedFiles = validFiles;
    this.successMessage = `${validFiles.length} file(s) selected successfully`;

    // Log selected files
    console.log('Files selected:', this.selectedFiles);
  }

  /**
   * Removes a file from the selected files list
   */
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    if (this.selectedFiles.length === 0) {
      this.successMessage = '';
    } else {
      this.successMessage = `${this.selectedFiles.length} file(s) selected successfully`;
    }
    this.cdr.markForCheck();
  }

  /**
   * Uploads the selected files
   */
  uploadFile(): void {
    if (this.selectedFiles.length === 0) {
      this.errorMessage = 'Please select at least one file first';
      return;
    }

    // Here you would implement the actual file upload logic
    // For example, using HttpClient to send the files to your backend

    // Create FormData and append each file
    const formData = new FormData();
    this.selectedFiles.forEach((file) => {
      formData.append('file', file);
    });

    // Set loading state
    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Send the files to the backend
    this.http
      .post('http://localhost:8080/api/upload', formData)
      .pipe(
        finalize(() => {
          this.isUploading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Upload response:', response);
          this.successMessage = `${this.selectedFiles.length} file(s) uploaded successfully`;
          this.selectedFiles = [];
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.errorMessage =
            error.error?.error || 'Failed to upload file(s). Please try again.';
        },
      });
  }
}
