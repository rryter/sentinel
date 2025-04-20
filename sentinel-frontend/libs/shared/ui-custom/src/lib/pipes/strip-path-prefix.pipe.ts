import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stripPathPrefix',
})
export class StripPathPrefixPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) {
      return '';
    }

    return value.replace('/home/rryter/projects', '');
  }
}
