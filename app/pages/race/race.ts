import {Modal, NavController, Page, ViewController} from 'ionic-angular';
import {EventEmitter} from '@angular/core';
import {ControlUnit, Drivers} from '../../providers';
import {Gauge, Startlight, Stripe} from '../../components.ts';
import {Car} from '../../models/car';

@Page({
  template: `
    <ion-content padding>
    <h1>Race Settings</h1>
    <ion-list>
    <ion-item>
    <ion-label>Laps</ion-label>
    <ion-input [(ngModel)]="laps" type="number" min="0"></ion-input>
    </ion-item>
    <ion-item>
    <ion-label>Time (min)</ion-label>
    <ion-input [(ngModel)]="time" type="number" min="0"></ion-input>
    </ion-item>
    <ion-item>
    <ion-label>Autonomous car</ion-label>
    <ion-toggle [(ngModel)]="auto"></ion-toggle>
    </ion-item>
    </ion-list>
    <button (click)="close()">OK</button>
    </ion-content>
  `
})
class Settings {

  laps = 5;
  time = 0;
  auto = false;

  constructor(private view: ViewController) {
  }

  close() {
    this.view.dismiss(this);
  }
}

@Page({
  directives: [Gauge, Startlight, Stripe],
  templateUrl: 'build/pages/race/race.html',
})
export class RacePage {
  cars = {};

  items = new EventEmitter<Car[]>();

  private lap = 0;
  private laps = 0;

  private startTime: number;
  private currentTime: number;

  private subscription: any;

  constructor(private cu: ControlUnit, private drivers: Drivers, private nav: NavController) {}

  onPageLoaded() {
    // FIXME: overlay on race screen on first open
    let modal = Modal.create(Settings);
    modal.onDismiss(settings => {
      this.laps = settings.laps;
    });
    setTimeout(() => this.nav.present(modal), 100);

    this.subscription = this.cu.lap.subscribe(event => this.onTime(event));
    this.cu.clearPosition();
    this.cu.reset();
  }

  onPageDidUnload() {
    this.subscription.unsubscribe();
  }

  private getCar(id: number) {
    if (!(id in this.cars)) {
      this.cars[id] = new Car(id);
    }
    return this.cars[id];
  }

  private start() {
    this.cu.start();
  }

  private onTime(event: any) {
    if (this.startTime === undefined) {
      this.startTime = event.time;
      this.currentTime = event.time;
    }
    let car = this.getCar(event.id);
    if (car.time) {
      car.laptime = event.time - car.time;
      if (++car.laps > this.lap) {
        this.lap = car.laps;
        this.cu.setLap(this.lap);
        this.currentTime = event.time;
      }
    }
    if (!car.bestlap || car.laptime < car.bestlap) {
      car.bestlap = car.laptime;
    }
    car.time = event.time;
    // TODO: ranking for practice mode, update positions
    let items = Object.keys(this.cars).map(id => this.cars[id]);
    items.sort((lhs, rhs) => (rhs.laps - lhs.laps) || (lhs.time - rhs.time));
    this.items.emit(items);
  }

  private inPit(id: string, mask: number) {
    let n = id.charCodeAt(0) - 0x31;
    let v = mask & (1 << n);
    return v != 0;
  }

  private time(item: Car) {
    let ms = item.time - this.startTime;
    let m = Math.floor(ms / 60000);
    let s = ((ms % 60000) / 1000);
    if (m) {
      return m.toString() + ':' + (s >= 10 ? '' : '0') + s.toFixed(3);
    } else {
      return s.toFixed(3);
    }
  }

  private gap(item: Car) {
    if (item.laps == this.lap) {
      return '+' + ((item.time - this.currentTime) / 1000).toFixed(3);
    } else{
      return '+' + (this.lap - item.laps) + ' laps';
    }
  }
}
