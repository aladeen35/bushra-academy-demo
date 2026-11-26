# البشرى للأدب — خطوات المالك (من الهاتف)

كل الخطوات تعمل من متصفح الهاتف (Chrome). لا تحتاج حاسوبًا ولا أوامر.

## ١) النشر الآن (يعمل فورًا)
بعد دمج الفرع في `main` يُنشر التطبيق تلقائيًا على GitHub Pages مع موقع الأكاديمية:
`https://aladeen35.github.io/bushra-academy-demo/literature/`

يعمل التطبيق كاملًا بلا حساب: المكتبة، والقارئ ثنائي اللغة، والقاموس، والنطق، والمفردات، والقواعد، والاختبارات، واختبار المستوى. يُحفظ التقدّم على جهاز المتعلّم.

## ٢) النطاق literature.albushra.app (Cloudflare Pages، مجاني)
نطاقك على Cloudflare، والمستودع الواحد على GitHub Pages لا يقبل إلا نطاقًا واحدًا، لذا نستخدم Cloudflare Pages للمجلد `literature`:
1. افتح dash.cloudflare.com ← **Workers & Pages** ← **Create** ← تبويب **Pages** ← **Connect to Git**.
2. اختر GitHub واسمح بالوصول إلى المستودع `bushra-academy-demo`.
3. Production branch: `main`. Framework preset: **None**. Build command: اتركه فارغًا. Build output directory: `literature`.
4. اضغط **Save and Deploy**.
5. بعد النشر افتح المشروع ← **Custom domains** ← **Set up a custom domain** ← اكتب `literature.albushra.app` ← **Activate domain** (Cloudflare يضيف سجل DNS تلقائيًا).

## ٣) Firebase: الحسابات وإدارة المحتوى والمعلّم الذكي (خطة Spark المجانية)
يُفضَّل مشروع مستقل عن «هدايا أمير» حتى لا تختلط قواعد الأمان.
1. افتح console.firebase.google.com ← **Add project** ← الاسم `albushra-literature` ← أوقف Google Analytics ← **Create project**.
2. **Build ← Authentication ← Get started**:
   - فعّل **Google** (اختر بريد الدعم) ثم **Save**.
   - فعّل **Email/Password** ثم **Save**.
   - تبويب **Settings ← Authorized domains ← Add domain**: أضف `literature.albushra.app` و `aladeen35.github.io`.
3. **Build ← Firestore Database ← Create database** ← اختر المنطقة `eur3 (europe-west)` ← **Start in production mode** ← **Create**.
4. في Firestore افتح تبويب **Rules**، واحذف كل ما فيه، والصق محتوى الملف `literature/firestore.rules` من GitHub، ثم **Publish**.
5. **Build ← AI Logic ← Get started** ← اختر **Gemini Developer API** ← **Enable** (مجاني ضمن حدود الاستخدام اليومية، ولا يوجد مفتاح سري داخل الموقع).
6. ⚙️ **Project settings ← General ← Your apps ← أيقونة الويب `</>`** ← الاسم `literature-web` ← **Register app** ← انسخ كائن `firebaseConfig`.
7. في GitHub من الهاتف افتح `literature/js/firebase-config.js` ← أيقونة القلم ✏️ ← استبدل `export const FIREBASE_CONFIG = null;` بـ:
   ```js
   export const FIREBASE_CONFIG = { apiKey: "…", authDomain: "…", projectId: "…", storageBucket: "…", messagingSenderId: "…", appId: "…" };
   ```
   ثم **Commit changes**.
8. افتح التطبيق ← **ملفي** ← سجّل الدخول بحساب Google ← افتح الرابط `#/admin` ← اضغط **تفعيل حسابي كمدير أول** (يعمل مرة واحدة فقط لأول مستخدم).

## ٤) إدارة المحتوى (من التطبيق)
- **إضافة كتاب**: إدارة المحتوى ← إضافة كتاب ← املأ البيانات والحقوق.
- **استيراد النص**: الفهرس ← الصق النص أو ارفع ملف ‎.txt‎ (مثل ملفات Project Gutenberg). يحفظ ترتيب الفقرات والفصول.
- **التحقق التحريري**: «تحقّق التحرير من النص» يعرض المواضع المشتبه بها (أخطاء OCR) لتصحيحها.
- **مراجعة الترجمة**: كل فقرة لها حالة: مسودة ← مراجَعة ← معتمدة. تبقى شارة «ترجمة بالذكاء الاصطناعي — بانتظار مراجعة المحرر» ظاهرة للمتعلّم حتى تُعتمد كل فقرات الفصل.
- **الحقوق**: لا يظهر النص الكامل للعامة إلا إذا كانت حالة الحقوق «ملكية عامة» أو «مرخّص»، وقواعد Firestore تفرض ذلك على الخادم أيضًا.

## ٥) ما يحتاج خطة Blaze (لاحقًا، بموافقتك)
- **Firebase Storage**: رفع وثائق التراخيص، والرسوم، وتسجيلات صوتية حقيقية. حاليًا تُحفظ وثائق التراخيص كروابط، والنطق من قارئ الجهاز.
- **Cloud Functions**: صوت TTS سحابي أعلى جودة، والشهادات، والاشتراكات.

## ٦) مراجعات يجب أن يقوم بها إنسان
- ترجمات الفصل الأول من «جين إير» و«جزيرة الكنز» و«سجين زندا» مسودات بالذكاء الاصطناعي، وتحتاج مراجعة محرر.
- ملخصات «الأشياء تتداعى» الخمسة والعشرون أصلية ولا تقتبس من الرواية. يُنصح بمطابقة الوقائع مع النسخة الورقية، خاصة الفصول ١٤ و١٦ و١٧ و٢٣.
- **الأشياء تتداعى محمية بحقوق النشر.** ملف PDF المرفق نسخة ممسوحة من طبعة Anchor 1994، ولا يحق لنا نشر نصها. نحتاج ترخيصًا من Penguin Random House / Heinemann قبل إضافة أي نص.

## ٧) نشر التطبيق على Google Play (من الهاتف)

### أ) بناء التطبيق (مرة لكل إصدار)
1. GitHub ← المستودع `bushra-academy-demo` ← **Actions** ← **Literature Android app (APK + AAB)** ← **Run workflow**.
   اكتب رقم الإصدار (مثل `1.0.0`) ← **Run workflow**. انتظر ١٠–١٥ دقيقة حتى تظهر علامة ✅.
2. افتح التشغيل، وانزل إلى **Artifacts**:
   - `albushra-literature-android`: فيه `app-release-bundle.aab` (للرفع على Play)، و`app-release-signed.apk` (للتجربة على هاتفك).
   - **في أول بناء فقط:** `KEEP-THIS-SAFE-literature-signing-key`. نزّله واحفظه في مكان آمن (Google Drive خاص). من دونه لن تستطيع تحديث التطبيق أبدًا. يُحذف من GitHub بعد ٧ أيام.
3. **في أول بناء فقط:** احفظ مفتاح التوقيع داخل GitHub حتى تُوقَّع كل الإصدارات القادمة بنفس المفتاح:
   المستودع ← **Settings** ← **Secrets and variables** ← **Actions** ← **New repository secret**:
   - `LITERATURE_KEYSTORE_BASE64` = محتوى الملف `android.keystore.base64.txt`
   - `LITERATURE_KEYSTORE_PASSWORD` = محتوى الملف `keystore-password.txt`

### ب) إنشاء التطبيق في Play Console
1. **play.google.com/console** ← **Create app**:
   - الاسم: `البشرى للأدب: تعلّم الإنجليزية`، واللغة الافتراضية العربية.
   - النوع: App ← Free.
2. **Test and release ← Production** (أو **Closed testing** إن كان حسابك جديدًا) ← **Create new release**.
   وافق على **Play App Signing**، ثم ارفع `app-release-bundle.aab`.
3. **Store presence ← Main store listing**: انسخ النصوص من `literature/store/LISTING.md`، وارفع:
   - أيقونة التطبيق: `store/app-icon-512.png`
   - صورة العرض: `store/ar/feature-graphic-1024x500.png`
   - لقطات الهاتف: `store/ar/01…08`
   - ثم أضف الترجمة الإنجليزية بملفات `store/en/`.
4. **App content**:
   - سياسة الخصوصية: `https://literature.albushra.app/privacy.html`
   - الإعلانات: **Yes, my app contains ads**.
   - الجمهور المستهدف: **13–15، 16–17، 18+**. لا تختر أقل من ١٣، وإلا طُبّقت قيود الأطفال على الإعلانات.
   - Data safety: البريد والاسم (اختياريان لتسجيل الدخول)، وتقدّم التعلّم. البيانات مشفّرة أثناء النقل، ويمكن حذفها.
   - Content rating: املأ الاستبيان، والتطبيق تعليمي.
5. حسابك الشخصي يحتاج **اختبارًا مغلقًا بـ١٢ مختبِرًا لمدة ١٤ يومًا** قبل الإنتاج.

### ج) إزالة شريط المتصفح من أعلى التطبيق (مهم)
بعد رفع أول AAB افتح **Test and release ← Setup ← App integrity ← App signing**، وانسخ **SHA-256 certificate fingerprint** لمفتاح **App signing key**.
أرسله لي مع البصمة الموجودة في ملف `upload-key-sha256.txt`، وسأضع ملف `.well-known/assetlinks.json`. بعده يفتح التطبيق بملء الشاشة دون شريط العنوان.
