import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-tutorial-item-description',
  templateUrl: './tutorial-item-description.component.html',
  styleUrls: ['./tutorial-item-description.component.scss']
})
export class TutorialItemDescriptionComponent implements OnInit {

  @Input() text: string;
  @Input() header: string;

  constructor() { }

  ngOnInit(): void {
  }

}
