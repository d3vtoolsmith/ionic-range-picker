import {
	Component,
	Input,
	Output,
	EventEmitter
} from '@angular/core';

import { ToastController } from 'ionic-angular';

import * as moment from 'moment';
import * as _ from 'lodash';

@Component({
	selector: 'range-picker',
	templateUrl: 'range-picker.html'
})
export class RangePickerComponent {
	// model
	@Input() boldDates: boolean = true;
	@Input() showSelection: boolean = true;
	@Input() showWeekdays: boolean = true;
	@Input() readOnly: boolean = false;
	@Input("numberOfMonths")
	get numberOfMonths(): number {
		return this._numberOfMonths;
	}
	set numberOfMonths(num) {
		console.log(`***NUM-OF-MONTHS => ${num} - num=${_.isNumber(num)} - str=${_.isString(num)}`)
		if (this._numberOfMonths != num) {
			this._numberOfMonths = num;
			this.initMonthDays();
		}
	}
	private _numberOfMonths: number = 2;

	@Input()
	get nonAvailability(): any[] {
		return this._nonAvailability;
	}
	set nonAvailability(na: any[]) {
		// TODO: ACCOMODATE FOR RESETTING OF NA ARRAY AT RUNTIME
		this._nonAvailability = na;

		let minDate = this.allDays[0].date;
		let maxDate = this.allDays[this.allDays.length - 1].date;

		_.forEach(na, nad => {
			// check if within bounds
			if (!moment(nad.date).isBetween(minDate, maxDate)) return;

			let calDate = _.find(this.allDays, d => moment(nad.date).isSame(d.date));
			if (calDate) {
				calDate.isAvailable = false;
			}
		});

		this.reflectCurrentlySelectedRange();
	}
	private _nonAvailability: any[];

	@Input()
	get nonEdge(): any {
		return this._nonEdge;
	}
	set nonEdge(ne: any) {
		this._nonEdge = ne;

		// set non-edge flags on days (cannot be start/end date of a range)
		_.forEach(this.allDays, d => {
			let dow = moment(d.date).format('dddd').toLowerCase(); // RangePickerComponent.DaysOfWeek[d.date.getDay()];
			d.isNonEdge = ne && !ne[dow].open;
		});
	}
	private _nonEdge: {
		monday: { open: boolean, hours: { from: string, to: string }[] },
		tuesday: { open: boolean, hours: { from: string, to: string }[] },
		wednesday: { open: boolean, hours: { from: string, to: string }[] },
		thursday: { open: boolean, hours: { from: string, to: string }[] },
		friday: { open: boolean, hours: { from: string, to: string }[] },
		saturday: { open: boolean, hours: { from: string, to: string }[] },
		sunday: { open: boolean, hours: { from: string, to: string }[] }
	};
	// private static DaysOfWeek = [
	// 	"sunday",
	// 	"monday",
	// 	"tuesday",
	// 	"wednesday",
	// 	"thursday",
	// 	"friday",
	// 	"saturday"
	// ];

	@Output() selectedFromChange: EventEmitter<any> = new EventEmitter<any>();
	@Input()
	get selectedFrom(): any {
		return this._selectedFrom;
	}
	set selectedFrom(from: any) {
		if (from && this.selectedTo && this.hasNonAvailableDays(from, this.selectedTo)) {
			// emit change event so binder updates its value
			this.selectedFromChange.emit(this.selectedFrom);
			return;
		}
		if (from && this.isNonAvailableDate(from.date)) {
			// emit change event so binder updates its value
			this.selectedFromChange.emit(this.selectedFrom);
			return;
		}

		this._selectedFrom = from;
		if (!from) {
			this.clearSelection();
		}

		this.reflectCurrentlySelectedRange();
	}
	private _selectedFrom: any = null;

	@Output()
	selectedToChange: EventEmitter<any> = new EventEmitter<any>();
	@Input()
	get selectedTo(): any {
		return this._selectedTo;
	}
	set selectedTo(to: any) {
		if (to && this.selectedFrom && this.hasNonAvailableDays(this.selectedFrom, to)) {
			// emit change event so binder updates its value
			this.selectedToChange.emit(this.selectedTo);
			return;
		}
		if (to && this.isNonAvailableDate(to.date)) {
			// emit change event so binder updates its value
			this.selectedToChange.emit(this.selectedTo);
			return;
		}

		this._selectedTo = to;
		if (!to) {
			this.clearSelection();
		}

		this.reflectCurrentlySelectedRange();
	}
	private _selectedTo: any = null;


	isFromDay(day: any): boolean {
		if (!this.selectedFrom || !day) return false;

		return moment(this.selectedFrom.date).isSame(day.date);
	}
	isToDay(day: any): boolean {
		if (!this.selectedTo || !day) return false;

		return moment(this.selectedTo.date).isSame(day.date);
	}

	// config data
	//weekDays: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	weekDays: string[] = ["S", "M", "T", "W", "T", "F", "S"];
	months: string[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	monthWeeksDays: {
		month: string,
		weeks: {
			days: {
				day: number,
				isEmpty: boolean,
				isPast: boolean,
				isAvailable: boolean,
				isNonEdge: boolean,
				date: Date
			}[]
		}[]
	}[];
	allDays: any[] = [];

	constructor(
		private _toastCtrl: ToastController
	) {
		this.initMonthDays();
	}

	private initMonthDays() {
		// prep selected from/to for comparisons
		let fromDefault = this.selectedFrom ? moment(this.selectedFrom.date) : null;
		let toDefault = this.selectedTo ? moment(this.selectedTo.date) : null;

		// clear all days
		this.allDays = [];

		// get now without time
		let tmpNow = new Date();
		let now = new Date(tmpNow.getFullYear(), tmpNow.getMonth(), tmpNow.getDate());

		// populate months-weeks-days for the number-of-months for inline calendar
		this.monthWeeksDays = [];
		for (let i = 0; i < this.numberOfMonths; i++) {
			// compute month
			let month = (now.getMonth() + i) <= 11 ? now.getMonth() + i : 0;
			let year = (now.getMonth() + i) <= 11 ? now.getFullYear() : now.getFullYear() + 1;

			let monthData = {
				month: this.months[month],
				weeks: []
			};

			let lastDay = moment(new Date(year, month, 1)).endOf("month").toDate();
			for (let d = 1; d <= lastDay.getDate();) {
				let weekData = {
					days: []
				}

				let thisDay = new Date(year, month, d);

				// fill empty days at the begining
				for (let ed = 0; ed < thisDay.getDay(); ed++) {
					weekData.days.push({
						day: null,
						isEmpty: true,
						isPast: true,
						isAvailable: false,
						isSelected: false,
						isNonEdge: false,
						date: null
					});
				}

				for (let wd = thisDay.getDay(); wd < 7 && d <= lastDay.getDate(); wd++ , d++) {
					thisDay = new Date(year, month, d);

					let dayData = {
						day: thisDay.getDate(),
						isEmpty: false,
						isPast: thisDay < now,
						isAvailable: thisDay >= now, // TODO: CONSIDER PRECOMPUTING "<DATE>"-based unavail object
						isSelected: false, // moment(thisDay).isSame(fromDefault) || ,
						isNonEdge: false, // <=== TODO: CONNECT TO DATA
						date: thisDay
					};

					weekData.days.push(dayData);
					this.allDays.push(dayData);
				}

				// fill empty days at the end
				if (weekData.days.length < 7) {
					for (let ed = 0; ed <= 7 - weekData.days.length + 1; ed++) {
						weekData.days.push({
							day: null,
							isEmpty: true,
							isPast: true,
							isAvailable: false,
							isSelected: false,
							isNonEdge: false,
							date: null
						});
					}
				}

				monthData.weeks.push(weekData);
			}

			this.monthWeeksDays.push(monthData);
		}

		this.reflectCurrentlySelectedRange();
	}

	dayTapped(day) {
		// don't select if readonly
		if (this.readOnly) return;

		// deselect both dates if tapped one of the currenty selected ones
		if (!_.isNil(this._selectedFrom) && !_.isNil(this._selectedTo) &&
			(this._selectedFrom == day || this._selectedTo == day)) {
			this.selectedTo = null;
			this.selectedFrom = null;
			return;
		}

		// ignore if non-selectable
		if (day.isEmpty || day.isPast || !day.isAvailable || day.isNonEdge) {
			if (!day.isAvailable || day.isNonEdge) {
				this._toastCtrl
					.create({
						// TODO: MAKE MESSAGE CONFIG PARAM
						message: !day.isAvailable
							? "Item is not available on this day"
							: "Owner is not available to check in/out the item on this day",
						duration: 2500,
						position: "top",
						cssClass: "idle-toast-info",
						dismissOnPageChange: true
					})
					.present();
			}
			return;
		}

		this.updateDateObjectsForCurrentFromTo(day);
	}

	private updateDateObjectsForCurrentFromTo(day: any) {
		if (!this.selectedFrom || day.date < this.selectedFrom.date) {
			this._selectedFrom = day;
			this.selectedFromChange.emit(this.selectedFrom);
			day.isSelected = true;
			this._selectedTo = null;
			this.selectedToChange.emit(this.selectedTo);
		}
		else if (this.selectedFrom && this.selectedFrom.date <= day.date &&
			!this.hasNonAvailableDays(this.selectedFrom, day))
		{
			this._selectedTo = day;
			this.selectedToChange.emit(this.selectedTo);
			day.isSelected = true;
		}

		this.reflectCurrentlySelectedRange();
	}

	private reflectCurrentlySelectedRange() {
		this.allDays.forEach((dayData) => {
			dayData.isSelected =
				(this.selectedFrom && this.selectedFrom.date == dayData.date) ||
				(this.selectedTo && this.selectedTo.date == dayData.date) ||
				(this.selectedFrom && this.selectedTo &&
					dayData.date >= this.selectedFrom.date &&
					dayData.date <= this.selectedTo.date);
		});
	}

	private hasNonAvailableDays(from: any, to: any): boolean {
		if (!this.allDays) return false;

		for (let calDay of this.allDays) {
			// skip prior days
			if (moment(calDay.date).isBefore(from.date)) continue;
			// return if past end date
			if (moment(calDay.date).isAfter(to.date)) return false;

			// check if n/a
			if (!calDay.isAvailable) return true;
		}

		return false;
	}

	private isNonAvailableDate(date: Date): boolean {
		if (_.isNil(date)) return true;
		if (!this.nonAvailability) return false;

		this.nonAvailability.forEach(nad => {
			if (moment(nad.date).isSame(date)) return true;
		});

		return false;
	}

	private clearSelection() {
		this.allDays.forEach((dayData) => {
			dayData.isSelected = false;
		});
	}
}
