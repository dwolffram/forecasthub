import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, shareReplay } from 'rxjs/operators';
import * as Papa from 'papaparse';
import * as moment from 'moment';
import { TruthToPlotDto } from '../models/truth-to-plot.dto';
import { TruthToPlot, TruthToPlotSource, TruthToPlotValue, DataSource } from '../models/truth-to-plot';
import { ForecastToPlot, ForecastToPlotType, ForecastToPlotTarget, QuantileType, QuantilePointType } from '../models/forecast-to-plot';
import { ForecastToPlotDto } from '../models/forecast-to-plot.dto';
import * as _ from 'lodash';
import { cacheTest } from './service-helper';



@Injectable({
  providedIn: 'root'
})
export class DataService {

  private readonly _urls = {
    source: {
      ecdc: 'https://raw.githubusercontent.com/KITmetricslab/covid19-forecast-hub-de/master/app_forecasts_de/data/truth_to_plot_ecdc.csv',
      jhu: 'https://raw.githubusercontent.com/KITmetricslab/covid19-forecast-hub-de/master/app_forecasts_de/data/truth_to_plot_jhu.csv'
    },
    forecast: 'https://raw.githubusercontent.com/KITmetricslab/covid19-forecast-hub-de/master/app_forecasts_de/data/forecasts_to_plot.csv'
  }

  ecdcData$: Observable<DataSource>;
  jhuData$: Observable<DataSource>;
  forecasts$: Observable<ForecastToPlot[]>;

  constructor(private http: HttpClient) {
    this.forecasts$ = this._loadCsvData(this._urls.forecast, (row: ForecastToPlotDto, i) => this.parseForecastDto(row, i));
    this.ecdcData$ = this._loadDataSource(this._urls.source.ecdc, TruthToPlotSource.ECDC);
    this.jhuData$ = this._loadDataSource(this._urls.source.jhu, TruthToPlotSource.JHU);
  }

  private _loadCsvData<T, S>(url: string, rowParser: (row: T, index: number) => S): Observable<S[]> {
    return this.http.get(url, { responseType: 'text' }).pipe(map(x => {
      const parsedCsv = Papa.parse<T>(x, { header: true, skipEmptyLines: true });
      const parsedData = _.chain(parsedCsv.data).reduce((prev, curr, i) => {
        try {
          prev.data.push(rowParser(curr, i));
        } catch (error) {
          prev.errors.push(error);
        }
        return prev;
      }, { errors: [], data: [] }).value();

      if (parsedData.errors.length > 0) {
        console.error(`PARSE :: Unable to parse ${parsedData.errors.length} rows in file '${url}'.\n${parsedData.errors.join('\n')}`);
      }

      return parsedData.data;
    })).pipe(shareReplay(1));
  }

  private _loadDataSource(url: string, name: TruthToPlotSource): Observable<DataSource> {
    return this._loadCsvData(url, ((row: TruthToPlotDto, i) => this.parseTruthDto({ ...row, source: name }, i)))
      .pipe(map(x => ({ name: name, data: _.orderBy(x, d => d.date) })));
  }



  private parseTruthDto(input: TruthToPlotDto, index: number): TruthToPlot {
    return {
      source: this.parseDataSource(input.source, index, input),
      date: this.parseDate(input.date),
      week: {
        weekNumber: this.parseInt(input.epi_week),
        year: this.parseInt(input.epi_year)
      },

      idLocation: input.location,

      cum_case: this.parseDecimal(input.cum_case),
      cum_death: this.parseDecimal(input.cum_death),
      inc_case: this.parseDecimal(input.inc_case),
      inc_death: this.parseDecimal(input.inc_death),
    };
  }

  private parseForecastDto(input: ForecastToPlotDto, index: number): ForecastToPlot {
    const parseType: (t: string) => ForecastToPlotType = (t) => {
      switch (t) {
        case 'observed': return ForecastToPlotType.Observed;
        case 'point': return ForecastToPlotType.Point;
        case 'quantile': return ForecastToPlotType.Quantile;
        default:
          throw new Error(`Unknown ForecastToPlotType.type '${t}' (expected: 'observed' | 'point' | 'quantile') at position '${index}' in '${JSON.stringify(input)}'.`);
      }
    }

    // const parseTarget: (t: string, end_date: moment.Moment, index: number) => ForecastToPlotTarget = (t, end_date, index) => {
    //   const parseRegEx = /(?<timeAhead>-?\d{1,3})\s(?<timeUnit>wk|day)\sahead\s(?<valueType>cum death|cum case|inc death|inc case|)/;
    //   const parsed = parseRegEx.exec(t);

    //   if (['wk', 'day'].indexOf(parsed.groups['timeUnit']) === -1) {
    //     throw new Error(`Unknown time_unit (expected: 'wk' | 'day') in target '${t}' at position '${index}' in '${JSON.stringify(input)}'.`);
    //   }

    //   let value_type = TruthToPlotValue.CumulatedCases;
    //   switch (parsed.groups['valueType']) {
    //     case 'cum death': value_type = TruthToPlotValue.CumulatedDeath; break;
    //     case 'cum case': value_type = TruthToPlotValue.CumulatedCases; break;
    //     case 'inc death': value_type = TruthToPlotValue.IncidenceDeath; break;
    //     case 'inc case': value_type = TruthToPlotValue.IncidenceCases; break;
    //     default: throw new Error(`Unknown value_type (expected: 'cum death' | 'cum case' | 'inc death' | 'inc case') in target '${t}' at position '${index}' in object '${JSON.stringify(input)}'.`);
    //   }


    //   return {
    //     time_ahead: this.parseInt(parsed.groups['timeAhead']),
    //     time_unit: <'wk' | 'day'>parsed.groups['timeUnit'],
    //     value_type,
    //     end_date
    //   };
    // }

    const parseTarget: (t: string, end_date: moment.Moment, index: number) => ForecastToPlotTarget = (t, end_date, index) => {
      const parseRegEx = /(-?\d{1,3})\s(wk|day)\sahead\s(cum death|cum case|inc death|inc case|)/;
      const parsed = parseRegEx.exec(t);

      if(parsed.length === 4){
        const timeAheadStr = parsed[1];
        const timeUnitStr = parsed[2];
        const valueTypeStr = parsed[3];

        if (['wk', 'day'].indexOf(timeUnitStr) === -1) {
          throw new Error(`Unknown time_unit (expected: 'wk' | 'day') in target '${t}' at position '${index}' in '${JSON.stringify(input)}'.`);
        }

        let value_type = TruthToPlotValue.CumulatedCases;
        switch (valueTypeStr) {
          case 'cum death': value_type = TruthToPlotValue.CumulatedDeath; break;
          case 'cum case': value_type = TruthToPlotValue.CumulatedCases; break;
          case 'inc death': value_type = TruthToPlotValue.IncidenceDeath; break;
          case 'inc case': value_type = TruthToPlotValue.IncidenceCases; break;
          default: throw new Error(`Unknown value_type (expected: 'cum death' | 'cum case' | 'inc death' | 'inc case') in target '${t}' at position '${index}' in object '${JSON.stringify(input)}'.`);
        }


        return {
          time_ahead: this.parseInt(timeAheadStr),
          time_unit: <'wk' | 'day'>timeUnitStr,
          value_type,
          end_date
        };
      }

      throw new Error(`Unable to parse target '${t}' at position '${index}' in '${JSON.stringify(input)}'.`);
    }

    const parseQuantile: (q: string) => { type: QuantileType, point: QuantilePointType } = (q) => {
      switch (q) {
        case '0.975':
          return { type: QuantileType.Q95, point: QuantilePointType.Upper };
        case '0.025':
          return { type: QuantileType.Q95, point: QuantilePointType.Lower };
        case '0.75':
          return { type: QuantileType.Q50, point: QuantilePointType.Upper };
        case '0.25':
          return { type: QuantileType.Q50, point: QuantilePointType.Lower };
        default:
          throw new Error(`Unknown quantile '${q}' (expected: '0.975' | '0.025' | '0.75' | '0.25') at position '${index}' in object '${JSON.stringify(input)}'. `)
      }
      //   Q95Lower = '0.025',
      //   Q95Upper = '0.095',

      //   Q50Lower = '0.25',
      //   Q50Upper = '0.75'
    }

    const type = parseType(input.type)

    return {
      forecast_date: this.parseDate(input.forecast_date),
      target: parseTarget(input.target, this.parseDate(input.target_end_date), index),
      location: input.location,
      type: type,
      quantile: type === ForecastToPlotType.Quantile ? parseQuantile(input.quantile) : null,
      value: this.parseDecimal(input.value),
      timezero: this.parseDate(input.timezero),
      model: input.model,
      truth_data_source: this.parseDataSource(input.truth_data_source, index, input),
      shifts: this.parseShifts(input),
      first_commit_date: this.parseDate(input.first_commit_date)
    };
  }

  private parseShifts(input: ForecastToPlotDto): Map<TruthToPlotSource, number> {
    const pairs = _.toPairs(input).filter(([key]) => key.startsWith('shift_')).map(([key, value]) => [<TruthToPlotSource>key.replace('shift_', '').toLowerCase(), this.parseInt(value)] as [TruthToPlotSource, number]);
    return new Map<TruthToPlotSource, number>(pairs);
  }

  private parseDataSource(input: string, index: number, srcObj: any): TruthToPlotSource {
    switch (input.toLowerCase()) {
      case 'ecdc': return TruthToPlotSource.ECDC;
      case 'jhu': return TruthToPlotSource.JHU;
      default:
        throw new Error(`Unknown TruthToPlotSource '${input}' at position '${index}' in '${JSON.stringify(srcObj)}'.`)
    }
  }

  private parseDate(input: string): moment.Moment {
    return moment(input, 'YYYY-MM-DD');
  }

  private parseInt(input: string): number {
    return parseInt(input, 10);
  }

  private parseDecimal(input: string): number {
    return parseFloat(input);
  }
}
