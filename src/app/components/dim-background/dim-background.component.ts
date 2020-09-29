import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-dim-background',
  templateUrl: './dim-background.component.html',
  styleUrls: ['./dim-background.component.scss']
})
export class DimBackgroundComponent implements OnInit {

  @Input() height: string;

  constructor() { }

  ngOnInit(): void {
  }

}
