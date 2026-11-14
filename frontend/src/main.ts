import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { boot } from './store'
import { watchForUpdates } from './update'
import './styles/base.css'

createApp(App).use(router).mount('#app')
void boot()
watchForUpdates()
