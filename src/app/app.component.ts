import { Component, OnInit } from '@angular/core';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { Observable } from 'rxjs';
import { AppStateService } from './services/app-state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  icons = { github: faGithub }
  navbarCollapsed = true;
  footerItems$: Observable<any[]>;

  constructor(private appState: AppStateService){}

  ngOnInit(): void {
    this.footerItems$ = this.appState.footerItems$;
  }

}
