import { createRouter, createWebHashHistory } from 'vue-router'
import SchedulePage from './views/SchedulePage.vue'
import InventoryPage from './views/InventoryPage.vue'
import FaqPage from './views/FaqPage.vue'
import AircraftLayout from './views/aircraft/AircraftLayout.vue'
import TasksPage from './views/aircraft/TasksPage.vue'
import DocumentsPage from './views/aircraft/DocumentsPage.vue'
import DeadlinesPage from './views/aircraft/DeadlinesPage.vue'
import DefectsPage from './views/aircraft/DefectsPage.vue'
import MaterialPage from './views/aircraft/MaterialPage.vue'

// Hash-Routing, damit GitHub Pages ohne Server-Rewrites funktioniert.
export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: SchedulePage },
    { path: '/inventur', component: InventoryPage },
    { path: '/faq', component: FaqPage },
    {
      path: '/flugzeug/:id',
      component: AircraftLayout,
      children: [
        { path: '', redirect: (to) => `/flugzeug/${to.params.id}/kanban` },
        { path: 'kanban', component: TasksPage },
        { path: 'dokumente', component: DocumentsPage },
        { path: 'fristen', component: DeadlinesPage },
        { path: 'maengel', component: DefectsPage },
        { path: 'material', component: MaterialPage },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
