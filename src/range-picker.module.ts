import { NgModule, ModuleWithProviders } from '@angular/core';
import { IonicModule } from 'ionic-angular';

import { Observable } from 'rxjs';

import { RangePickerComponent } from './components/range-picker';
// import { MyProvider } from './providers/my-provider';

@NgModule({
	declarations: [
		// declare all components that your module uses
		RangePickerComponent
	],
	imports: [
		IonicModule
	],
	exports: [
		// export the component(s) that you want others to be able to use
		RangePickerComponent
	],
	entryComponents: [
		RangePickerComponent
	]
})
export class RangePickerModule {
	static forRoot(): ModuleWithProviders {
		return {
			ngModule: RangePickerModule,
			// providers: [MyProvider]
		};
	}
}

