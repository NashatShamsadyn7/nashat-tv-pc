# سجل التغييرات — Changelog

جميع التغييرات الملحوظة في هذا المشروع تُوثَّق في هذا الملف.

## [1.5.5] - 2026-11-01

### إصلاحات (Fixes)

- **القنوات الميتة لم تعد تظهر:** القنوات المعلَّمة `isAlive: false` في قاعدة البيانات كانت تظهر في الشبكة وتفشل عند الضغط. صارت تُخفى.
- **البث المباشر يظهر أسرع:** آخر قائمة قنوات تُحفظ محلياً وتظهر فوراً عند الفتح، ثم تُستبدل بالقائمة الحيّة من Firebase.
- **صفحة المحتوى العربي** تعيد جلب العناوين عند تغيير لغة الواجهة بدل إبقاء اللغة السابقة.
- **البحث في وضع الأطفال:** نتائج البحث تُفلتر من جديد عند التبديل إلى ملف أطفال.

### Fixed (English)

- Channels flagged `isAlive: false` are no longer listed (they only produced tiles that failed on click).
- Live TV shows the last known channel list immediately while the RTDB subscription connects.
- The Arabic page refetches titles when the UI language changes.
- Search re-applies the kids filter when the active profile switches to a kids profile.

## [1.4.0] - 2026

### إصلاحات (Fixes)

- **إصلاح الشاشة السوداء عند بدء التشغيل (Black screen on launch).**
  - كان `src/renderer/src/services/firebase.ts` يرمي استثناءً على مستوى الوحدة
    (`assertConfig()`) وقت الاستيراد عندما تكون متغيّرات `VITE_FIREBASE_*` مفقودة.
    هذا الخطأ يحدث قبل أن يبدأ React بالعرض، فلا يلتقطه `ErrorBoundary`، وتبقى
    عنصر `#root` فارغة على خلفية داكنة = شاشة سوداء صامتة عند المستخدمين.
  - الآن لم تعد الوحدة ترمي وقت التحميل: يتم حساب المفاتيح المفقودة وتصديرها عبر
    `firebaseConfigError`، وتُهيَّأ خدمات Firebase بشكل دفاعي (مع حماية
    `getDatabase`)، فيبقى الـ renderer قابلاً للتحميل.
  - أُضيفت شاشة خطأ واضحة وقابلة للقراءة (بدل الشاشة السوداء) تظهر عند وجود
    خلل في الإعدادات، مع رسالة تطلب من المستخدم تحديث/إعادة تثبيت التطبيق.

### Fixed (English)

- Prevented a silent black screen at startup caused by a top-level `throw` in
  the Firebase service during module import (before React mounts, so the
  `ErrorBoundary` could not catch it).
- Firebase now fails defensively: it exports `firebaseConfigError`, guards
  Realtime Database initialization, and the app renders a visible, readable
  error panel instead of an empty dark screen when configuration is missing.
- Bumped version to 1.4.0 so `electron-updater` treats this as a newer build
  and auto-updates clients running the broken release.
