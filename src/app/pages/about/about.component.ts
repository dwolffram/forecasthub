import { Component, OnInit } from '@angular/core';
import { faCalculator, faChartLine, faDatabase, faNotEqual, faServer, faVenusMars } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

  icons = {
    gather: faDatabase,
    prepare: faServer,
    predict: faCalculator,
    evaluation: faNotEqual,
    visualisation: faChartLine
  };

  constructor() { }

  ngOnInit(): void {
  }

}
