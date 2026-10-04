import { Routes } from '@angular/router';
import { PokedexPageComponent } from './components/pokedex-page/pokedex-page.component';

export const POKEDEX_ROUTES: Routes = [
  {
    path: '',
    component: PokedexPageComponent,
  },
];
