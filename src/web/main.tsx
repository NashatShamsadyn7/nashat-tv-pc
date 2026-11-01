// Web entry: install the browser stand-in for the Electron preload bridge
// before the renderer's own entry evaluates.
import './shim'
import './mobileNav'
import i18n from '@/i18n'
import '../renderer/src/main'

i18n.addResource('en', 'translation', 'app.tagline', 'Web edition')
i18n.addResource('ar', 'translation', 'app.tagline', 'نسخة الويب')
i18n.addResource('ku', 'translation', 'app.tagline', 'وەشانی وێب')
