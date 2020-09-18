export enum TruthToPlotSource {
  ECDC = 'ecdc',
  JHU = 'jhu'
}

export enum TruthToPlotValue {
  CumulatedDeath = 'cum_death',
  IncidenceDeath = 'inc_death',
  CumulatedCases = 'cum_case',
  IncidenceCases = 'inc_case'
}

export interface TruthToPlot {
  source: TruthToPlotSource;

  date: moment.Moment;

  week: {
    weekNumber: number,
    year: number
  }

  idLocation: string;

  cum_death: number;
  inc_death: number;
  cum_case: number;
  inc_case: number;
}

export interface DataSource {
  name: TruthToPlotSource;
  data: TruthToPlot[];
}
