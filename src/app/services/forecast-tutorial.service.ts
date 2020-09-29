import { FlexibleConnectedPositionStrategy, Overlay } from '@angular/cdk/overlay';
import { ComponentPortal, DomPortal, DomPortalOutlet, Portal, TemplatePortal } from '@angular/cdk/portal';
import { ElementRef, Injectable, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';
import { EmptyComponent } from '../components/empty/empty.component';
import { TutorialItemDescriptionComponent } from '../components/tutorial-item-description/tutorial-item-description.component';
import { TutorialSettingsDescriptionComponent } from '../components/tutorial-settings-description/tutorial-settings-description.component';

@Injectable({
  providedIn: 'root'
})
export class ForecastTutorialService {

  constructor(private overlay: Overlay) { }

  showSettingsDescription(viewRef: ElementRef) {
    const overlay = this.overlay.create({
      positionStrategy: this.overlay.position().flexibleConnectedTo(viewRef)
        .withPositions([{
          originX: 'start',
          originY: 'top',
          overlayX: 'end',
          overlayY: 'top',
        }
        // , {
        //   originX: 'start',
        //   originY: 'top',
        //   overlayX: 'start',
        //   overlayY: 'bottom',
        // }
      ]),
      panelClass: 'overlay-panel',
      // hasBackdrop: true,
      // backdropClass: 'overlay-backdrop'
    });
    overlay.attach(new ComponentPortal(TutorialSettingsDescriptionComponent));
  }

  showItemDescriptions(items: { viewRef: ElementRef, header: string; text: string; }[]) {
    items.forEach(x => {
      const overlayRef = this.overlay.create({
        positionStrategy: this.overlay.position().flexibleConnectedTo(x.viewRef)
          .withPositions([{
            originX: 'start',
            originY: 'bottom',
            overlayX: 'start',
            overlayY: 'top',
          }, {
            originX: 'start',
            originY: 'top',
            overlayX: 'start',
            overlayY: 'bottom',
          }])
      });

      const filePreviewPortal = new ComponentPortal(TutorialItemDescriptionComponent);

      const component = overlayRef.attach(filePreviewPortal);
      component.instance.header = x.header;
      component.instance.text = x.text;
    });

  }
}
