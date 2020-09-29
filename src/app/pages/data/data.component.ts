import { Component, OnInit } from '@angular/core';
import { faCalculator, faChartLine, faDatabase, faNotEqual, faServer, faVenusMars } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-data',
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss']
})
export class DataComponent implements OnInit {

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
