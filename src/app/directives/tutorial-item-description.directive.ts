import { Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[appTutorialItemDescription]'
})
export class TutorialItemDescriptionDirective {

  @Input() tutorialHeader: string;
  @Input() tutorialText: string;

  constructor(public elementRef: ElementRef) { }

}
