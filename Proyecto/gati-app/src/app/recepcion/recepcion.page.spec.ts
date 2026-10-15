import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecepcionPage } from './recepcion.page';

describe('RecepcionPage', () => {
  let component: RecepcionPage;
  let fixture: ComponentFixture<RecepcionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RecepcionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
