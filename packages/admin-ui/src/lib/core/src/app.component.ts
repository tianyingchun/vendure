import { DOCUMENT } from '@angular/common';
import { Component, HostBinding, Inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { DataService } from './data/providers/data.service';
import { LocalStorageService } from './providers/local-storage/local-storage.service';

@Component({
    selector: 'vdr-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
    loading$: Observable<boolean>;
    private _document?: Document;

    constructor(
        private dataService: DataService,
        private localStorageService: LocalStorageService,
        @Inject(DOCUMENT) private document?: any,
    ) {
        this._document = document;
    }

    ngOnInit() {
        this.loading$ = this.dataService.client
            .getNetworkStatus()
            .stream$.pipe(map(data => 0 < data.networkStatus.inFlightRequests));

        this.dataService.client
            .uiState()
            .mapStream(data => data.uiState.theme)
            .subscribe(theme => {
                this._document?.body.setAttribute('data-theme', theme);
            });

        this.dataService.client
            .uiState()
            .mapStream(data => data.uiState.contentLanguage)
            .subscribe(code => {
                this.localStorageService.set('contentLanguageCode', code);
            });
    }
}
