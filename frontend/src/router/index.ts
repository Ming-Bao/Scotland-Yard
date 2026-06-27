import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import CreateGameView from '../views/CreateGameView.vue'
import JoinGameView from '../views/JoinGameView.vue'
import LobbyView from '../views/LobbyView.vue'
import GameBoardView from '../views/GameBoardView.vue'
import GameEndView from '../views/GameEndView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',             component: LandingView },
    { path: '/create',       component: CreateGameView },
    { path: '/join',         component: JoinGameView },
    { path: '/lobby/:id',    component: LobbyView },
    { path: '/game/:id',     component: GameBoardView },
    { path: '/game/:id/end', component: GameEndView },
  ]
})

export default router
